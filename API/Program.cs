using System.Security.Claims;
using System.Diagnostics;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.Extensions.FileProviders;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using NexusPms.Api.Helpers;
using NexusPms.Api.Models;

//#region Edit By AI
var builder = WebApplication.CreateBuilder(args);

var tokenKey = builder.Configuration["AdminAuth:TokenKey"] ?? string.Empty;
var signingKeyBytes = ResolveSigningKeyBytes(tokenKey);
var signingKey = new SymmetricSecurityKey(signingKeyBytes);

builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();
});

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateIssuerSigningKey = true,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromSeconds(30),
            ValidIssuer = "NexusPms.Api",
            ValidAudience = "NexusPms.Admin",
            IssuerSigningKey = signingKey,
        };
    });

builder.Services.AddAuthorization();
builder.Services.AddCors(options =>
{
    options.AddPolicy("FrontendCors", policy =>
    {
        policy
            .WithOrigins(
                "https://ecss-sa.com",
                "https://docs.ecss-sa.com",
                "http://localhost:4200",
                "http://127.0.0.1:4200")
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

var app = builder.Build();

var publicRootConfig = builder.Configuration["Storage:PublicRoot"] ?? "../public";
var configuredPublicRoot = Path.GetFullPath(Path.Combine(app.Environment.ContentRootPath, publicRootConfig));
var publishPublicRoot = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "public"));
var workspacePublicRoot = Path.GetFullPath(Path.Combine(app.Environment.ContentRootPath, "../public"));

var publicRootCandidates = new[]
{
    configuredPublicRoot,
    publishPublicRoot,
    workspacePublicRoot,
};

var publicRoot = publicRootCandidates.FirstOrDefault(Directory.Exists) ?? publishPublicRoot;

var dataRoot = Path.Combine(publicRoot, "data");
var guidesRoot = Path.Combine(dataRoot, "guides");
var uploadsRoot = Path.Combine(publicRoot, "uploads");
var groupsFile = Path.Combine(dataRoot, "groups.json");
var sectionsFile = Path.Combine(dataRoot, "sections.json");

Directory.CreateDirectory(dataRoot);
Directory.CreateDirectory(guidesRoot);
Directory.CreateDirectory(uploadsRoot);
if (!File.Exists(groupsFile))
{
    await File.WriteAllTextAsync(groupsFile, "[]");
}
if (!File.Exists(sectionsFile))
{
    await File.WriteAllTextAsync(sectionsFile, "[]");
}

app.UseForwardedHeaders();

app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(dataRoot),
    RequestPath = "/data",
});
app.Use(async (context, next) =>
{
    if (context.Request.Path.StartsWithSegments("/data") || context.Request.Path.StartsWithSegments("/uploads"))
    {
        if (!IsTrustedAssetRequest(context.Request))
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            await context.Response.WriteAsync("Forbidden");
            return;
        }
    }

    await next();
});
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(uploadsRoot),
    RequestPath = "/uploads",
});
app.UseDefaultFiles();
app.UseStaticFiles();
app.UseCors("FrontendCors");
app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/api/auth/status", (ClaimsPrincipal user) =>
{
    var authenticated = user.Identity?.IsAuthenticated ?? false;
    return Results.Ok(new
    {
        ok = true,
        authenticated,
        user = authenticated ? user.Identity?.Name : null,
    });
});

app.MapPost("/api/auth/login", async (HttpContext http) =>
{
    var body = await http.Request.ReadFromJsonAsync<LoginRequest>();
    if (body is null)
    {
        return Results.BadRequest(new { ok = false, error = "Invalid payload" });
    }

    var username = (builder.Configuration["AdminAuth:Username"] ?? string.Empty).Trim();
    var password = builder.Configuration["AdminAuth:Password"] ?? string.Empty;

    if (!string.Equals(body.Username?.Trim(), username, StringComparison.OrdinalIgnoreCase) || body.Password != password)
    {
        return Results.Ok(new { ok = false, error = "اسم المستخدم أو كلمة المرور غير صحيحة" });
    }

    var claims = new List<Claim>
    {
        new(ClaimTypes.Name, username),
        new(ClaimTypes.Role, "Admin"),
    };

    var tokenHours = int.TryParse(builder.Configuration["AdminAuth:TokenHours"], out var configuredHours)
        ? Math.Max(1, configuredHours)
        : 12;

    var expiresAt = DateTime.UtcNow.AddHours(tokenHours);
    var jwtToken = new JwtSecurityToken(
        issuer: "NexusPms.Api",
        audience: "NexusPms.Admin",
        claims: claims,
        notBefore: DateTime.UtcNow,
        expires: expiresAt,
        signingCredentials: new SigningCredentials(signingKey, SecurityAlgorithms.HmacSha256)
    );

    var token = new JwtSecurityTokenHandler().WriteToken(jwtToken);

    return Results.Ok(new
    {
        ok = true,
        user = username,
        token,
        expiresInSeconds = tokenHours * 3600,
    });
});

app.MapPost("/api/auth/logout", () =>
{
    return Results.Ok(new { ok = true, authenticated = false });
});

app.MapPost("/api/docs/media/upload", async (HttpContext http) =>
    {
        var form = await http.Request.ReadFormAsync();
        var route = StoragePaths.NormalizeRoute(form["route"]);
        var guideNumberRaw = form["guideNumber"].ToString();
        var lang = form["lang"].ToString().Trim().ToLowerInvariant();
        var file = form.Files.GetFile("file");

        if (!StoragePaths.IsSafeSegment(route))
        {
            return Results.BadRequest(new { ok = false, error = "Invalid route" });
        }

        var guideNumber = int.TryParse(guideNumberRaw, out var parsedNumber) ? Math.Max(1, parsedNumber) : 1;
        if (lang is not ("ar" or "en"))
        {
            return Results.BadRequest(new { ok = false, error = "Invalid language" });
        }

        if (file is null || file.Length == 0)
        {
            return Results.BadRequest(new { ok = false, error = "Missing file" });
        }

        var mediaType = DetectMediaType(file.ContentType, file.FileName);
        if (mediaType is null)
        {
            return Results.BadRequest(new { ok = false, error = "Unsupported media type. Allowed: image, video, gif" });
        }

        var extension = ResolveExtension(file.FileName, mediaType);
        var uniqueName = Guid.NewGuid().ToString("N");
        var fileName = $"{mediaType}-{uniqueName}{extension}";

        var directory = Path.Combine(uploadsRoot, route, guideNumber.ToString(), lang);
        Directory.CreateDirectory(directory);

        foreach (var existingPath in Directory.GetFiles(directory))
        {
            File.Delete(existingPath);
        }

        var filePath = Path.Combine(directory, fileName);
        await using (var stream = File.Create(filePath))
        {
            await file.CopyToAsync(stream);
        }

        if (mediaType == "video")
        {
            // Re-encode to a broadly compatible MP4 profile to avoid early-stop playback issues on some clients.
            TryNormalizeVideoInPlace(filePath);
        }

        var relativePath = $"uploads/{route}/{guideNumber}/{lang}/{fileName}";
        return Results.Ok(new { type = mediaType, src = relativePath });
    })
    .RequireAuthorization();

app.MapPost("/api/docs/sections/save", async (HttpContext http) =>
    {
        var form = await http.Request.ReadFormAsync();
        var originalRoute = StoragePaths.NormalizeRoute(form["original_route"]);
        var route = StoragePaths.NormalizeRoute(form["route"]);
        var groupRoute = StoragePaths.NormalizeRoute(form["group_route"]);

        if (!StoragePaths.IsSafeSegment(route))
        {
            return Results.BadRequest(new { ok = false, error = "Invalid route" });
        }

        if (!string.IsNullOrWhiteSpace(groupRoute) && !StoragePaths.IsSafeSegment(groupRoute))
        {
            return Results.BadRequest(new { ok = false, error = "Invalid group route" });
        }

        var groups = await ReadJsonAsync<List<GroupModel>>(groupsFile) ?? new List<GroupModel>();
        if (!string.IsNullOrWhiteSpace(groupRoute) && !groups.Any(g => string.Equals(g.Route, groupRoute, StringComparison.OrdinalIgnoreCase)))
        {
            return Results.BadRequest(new { ok = false, error = "Group not found" });
        }

        var sections = await ReadJsonAsync<List<SectionModel>>(sectionsFile) ?? new List<SectionModel>();
        var requestedOrder = int.TryParse(form["order"], out var parsedSectionOrder) ? Math.Max(1, parsedSectionOrder) : 0;

        var payload = new SectionModel
        {
            Id = route,
            Route = route,
            Icon = string.IsNullOrWhiteSpace(form["icon"]) ? "📄" : form["icon"].ToString(),
            Order = requestedOrder > 0 ? requestedOrder : sections.Count + 1,
            GroupRoute = groupRoute,
            Title = new LocalizedText
            {
                Ar = form["title_ar"].ToString().Trim(),
                En = form["title_en"].ToString().Trim(),
            },
            Desc = new LocalizedText
            {
                Ar = form["desc_ar"].ToString().Trim(),
                En = form["desc_en"].ToString().Trim(),
            },
        };

        if (!string.IsNullOrWhiteSpace(originalRoute))
        {
            var index = sections.FindIndex(s => string.Equals(s.Route, originalRoute, StringComparison.OrdinalIgnoreCase));
            if (index < 0)
            {
                return Results.NotFound(new { ok = false, error = "Section not found" });
            }

            payload.Order = requestedOrder > 0 ? requestedOrder : sections[index].Order;
            sections[index] = payload;
            await WriteJsonAsync(sectionsFile, sections);

            if (!string.Equals(originalRoute, route, StringComparison.OrdinalIgnoreCase))
            {
                var oldGuidesPath = Path.Combine(guidesRoot, $"{originalRoute}.json");
                var newGuidesPath = Path.Combine(guidesRoot, $"{route}.json");
                if (File.Exists(oldGuidesPath))
                {
                    File.Copy(oldGuidesPath, newGuidesPath, overwrite: true);
                    File.Delete(oldGuidesPath);
                }
            }

            return Results.Ok(new { ok = true });
        }

        sections.Add(payload);
        await WriteJsonAsync(sectionsFile, sections);

        var routeGuidesPath = Path.Combine(guidesRoot, $"{route}.json");
        if (!File.Exists(routeGuidesPath))
        {
            await WriteJsonAsync(routeGuidesPath, new List<GuideModel>());
        }

        return Results.Ok(new { ok = true });
    })
    .RequireAuthorization();

app.MapPost("/api/docs/sections/reorder", async (HttpContext http) =>
    {
        var body = await http.Request.ReadFromJsonAsync<ReorderRequest>();
        var orders = body?.Orders ?? new List<ReorderItem>();
        if (orders.Count == 0)
        {
            return Results.BadRequest(new { ok = false, error = "Missing orders" });
        }

        foreach (var item in orders)
        {
            item.Route = StoragePaths.NormalizeRoute(item.Route);
            item.Order = Math.Max(1, item.Order);
            if (!StoragePaths.IsSafeSegment(item.Route))
            {
                return Results.BadRequest(new { ok = false, error = "Invalid route" });
            }
        }

        var sections = await ReadJsonAsync<List<SectionModel>>(sectionsFile) ?? new List<SectionModel>();
        var orderMap = orders
            .GroupBy(item => item.Route, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(group => group.Key, group => group.Last().Order, StringComparer.OrdinalIgnoreCase);

        foreach (var section in sections)
        {
            if (orderMap.TryGetValue(section.Route, out var nextOrder))
            {
                section.Order = nextOrder;
            }
        }

        await WriteJsonAsync(sectionsFile, sections);
        return Results.Ok(new { ok = true });
    })
    .RequireAuthorization();

app.MapPost("/api/docs/groups/save", async (HttpContext http) =>
    {
        var form = await http.Request.ReadFormAsync();
        var originalRoute = StoragePaths.NormalizeRoute(form["original_route"]);
        var route = StoragePaths.NormalizeRoute(form["route"]);

        if (!StoragePaths.IsSafeSegment(route))
        {
            return Results.BadRequest(new { ok = false, error = "Invalid route" });
        }

        var groups = await ReadJsonAsync<List<GroupModel>>(groupsFile) ?? new List<GroupModel>();
        var sections = await ReadJsonAsync<List<SectionModel>>(sectionsFile) ?? new List<SectionModel>();
        var requestedOrder = int.TryParse(form["order"], out var parsedGroupOrder) ? Math.Max(1, parsedGroupOrder) : 0;

        var payload = new GroupModel
        {
            Id = route,
            Route = route,
            Icon = string.IsNullOrWhiteSpace(form["icon"]) ? "📂" : form["icon"].ToString(),
            Order = requestedOrder > 0 ? requestedOrder : groups.Count + 1,
            Title = new LocalizedText
            {
                Ar = form["title_ar"].ToString().Trim(),
                En = form["title_en"].ToString().Trim(),
            },
            Desc = new LocalizedText
            {
                Ar = form["desc_ar"].ToString().Trim(),
                En = form["desc_en"].ToString().Trim(),
            },
        };

        if (!string.IsNullOrWhiteSpace(originalRoute))
        {
            var index = groups.FindIndex(g => string.Equals(g.Route, originalRoute, StringComparison.OrdinalIgnoreCase));
            if (index < 0)
            {
                return Results.NotFound(new { ok = false, error = "Group not found" });
            }

            payload.Order = requestedOrder > 0 ? requestedOrder : groups[index].Order;
            groups[index] = payload;
            await WriteJsonAsync(groupsFile, groups);

            if (!string.Equals(originalRoute, route, StringComparison.OrdinalIgnoreCase))
            {
                foreach (var section in sections.Where(s => string.Equals(s.GroupRoute, originalRoute, StringComparison.OrdinalIgnoreCase)))
                {
                    section.GroupRoute = route;
                }

                await WriteJsonAsync(sectionsFile, sections);
            }

            return Results.Ok(new { ok = true });
        }

        groups.Add(payload);
        await WriteJsonAsync(groupsFile, groups);

        return Results.Ok(new { ok = true });
    })
    .RequireAuthorization();

app.MapPost("/api/docs/groups/reorder", async (HttpContext http) =>
    {
        var body = await http.Request.ReadFromJsonAsync<ReorderRequest>();
        var orders = body?.Orders ?? new List<ReorderItem>();
        if (orders.Count == 0)
        {
            return Results.BadRequest(new { ok = false, error = "Missing orders" });
        }

        foreach (var item in orders)
        {
            item.Route = StoragePaths.NormalizeRoute(item.Route);
            item.Order = Math.Max(1, item.Order);
            if (!StoragePaths.IsSafeSegment(item.Route))
            {
                return Results.BadRequest(new { ok = false, error = "Invalid route" });
            }
        }

        var groups = await ReadJsonAsync<List<GroupModel>>(groupsFile) ?? new List<GroupModel>();
        var orderMap = orders
            .GroupBy(item => item.Route, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(group => group.Key, group => group.Last().Order, StringComparer.OrdinalIgnoreCase);

        foreach (var group in groups)
        {
            if (orderMap.TryGetValue(group.Route, out var nextOrder))
            {
                group.Order = nextOrder;
            }
        }

        await WriteJsonAsync(groupsFile, groups);
        return Results.Ok(new { ok = true });
    })
    .RequireAuthorization();

app.MapPost("/api/docs/guides/save", async (HttpContext http) =>
    {
        var form = await http.Request.ReadFormAsync();
        var route = StoragePaths.NormalizeRoute(form["route"]);
        if (!StoragePaths.IsSafeSegment(route))
        {
            return Results.BadRequest(new { ok = false, error = "Invalid route" });
        }

        var routeGuidesPath = Path.Combine(guidesRoot, $"{route}.json");
        var guides = await ReadJsonAsync<List<GuideModel>>(routeGuidesPath) ?? new List<GuideModel>();

        var id = form["id"].ToString().Trim();
        if (string.IsNullOrWhiteSpace(id))
        {
            id = Guid.NewGuid().ToString();
        }

        var number = int.TryParse(form["number"], out var parsedNumber) ? Math.Max(1, parsedNumber) : 1;

        var media = guides.FirstOrDefault(g => g.Id == id)?.Media ?? new Dictionary<string, GuideMedia>(StringComparer.OrdinalIgnoreCase);

        var mediaSrcAr = form["media_src_ar"].ToString().Trim().TrimStart('/');
        var mediaTypeAr = form["media_type_ar"].ToString().Trim();
        if (!string.IsNullOrWhiteSpace(mediaSrcAr))
        {
            media["ar"] = new GuideMedia { Type = string.IsNullOrWhiteSpace(mediaTypeAr) ? "image" : mediaTypeAr, Src = mediaSrcAr };
        }

        var mediaSrcEn = form["media_src_en"].ToString().Trim().TrimStart('/');
        var mediaTypeEn = form["media_type_en"].ToString().Trim();
        if (!string.IsNullOrWhiteSpace(mediaSrcEn))
        {
            media["en"] = new GuideMedia { Type = string.IsNullOrWhiteSpace(mediaTypeEn) ? "image" : mediaTypeEn, Src = mediaSrcEn };
        }

        var payload = new GuideModel
        {
            Id = id,
            Number = number,
            Title = new LocalizedText
            {
                Ar = form["title_ar"].ToString().Trim(),
                En = form["title_en"].ToString().Trim(),
            },
            Desc = new LocalizedText
            {
                Ar = form["desc_ar"].ToString().Trim(),
                En = form["desc_en"].ToString().Trim(),
            },
            Media = media,
        };

        var index = guides.FindIndex(g => g.Id == id);
        if (index >= 0)
        {
            guides[index] = payload;
        }
        else
        {
            guides.Add(payload);
        }

        await WriteJsonAsync(routeGuidesPath, guides);
        return Results.Ok(new { ok = true });
    })
    .RequireAuthorization();

app.MapDelete("/api/docs/sections/{route}", async (string route) =>
    {
        route = StoragePaths.NormalizeRoute(route);
        if (!StoragePaths.IsSafeSegment(route))
        {
            return Results.BadRequest(new { ok = false, error = "Invalid route" });
        }

        var sections = await ReadJsonAsync<List<SectionModel>>(sectionsFile) ?? new List<SectionModel>();
        var beforeCount = sections.Count;
        sections = sections.Where(s => !string.Equals(s.Route, route, StringComparison.OrdinalIgnoreCase)).ToList();
        if (sections.Count == beforeCount)
        {
            return Results.NotFound(new { ok = false, error = "Section not found" });
        }

        await WriteJsonAsync(sectionsFile, sections);

        var routeGuidesPath = Path.Combine(guidesRoot, $"{route}.json");
        if (File.Exists(routeGuidesPath))
        {
            File.Delete(routeGuidesPath);
        }

        var routeUploadsPath = Path.Combine(uploadsRoot, route);
        if (Directory.Exists(routeUploadsPath))
        {
            Directory.Delete(routeUploadsPath, recursive: true);
        }

        return Results.Ok(new { ok = true });
    })
    .RequireAuthorization();

app.MapPost("/api/docs/sections/delete", async (HttpContext http) =>
    {
        var form = await http.Request.ReadFormAsync();
        var route = StoragePaths.NormalizeRoute(form["route"]);

        if (!StoragePaths.IsSafeSegment(route))
        {
            return Results.BadRequest(new { ok = false, error = "Invalid route" });
        }

        var sections = await ReadJsonAsync<List<SectionModel>>(sectionsFile) ?? new List<SectionModel>();
        var beforeCount = sections.Count;
        sections = sections.Where(s => !string.Equals(s.Route, route, StringComparison.OrdinalIgnoreCase)).ToList();
        if (sections.Count == beforeCount)
        {
            return Results.NotFound(new { ok = false, error = "Section not found" });
        }

        await WriteJsonAsync(sectionsFile, sections);

        var routeGuidesPath = Path.Combine(guidesRoot, $"{route}.json");
        if (File.Exists(routeGuidesPath))
        {
            File.Delete(routeGuidesPath);
        }

        var routeUploadsPath = Path.Combine(uploadsRoot, route);
        if (Directory.Exists(routeUploadsPath))
        {
            Directory.Delete(routeUploadsPath, recursive: true);
        }

        return Results.Ok(new { ok = true });
    })
    .RequireAuthorization();

app.MapPost("/api/docs/groups/delete", async (HttpContext http) =>
    {
        var form = await http.Request.ReadFormAsync();
        var route = StoragePaths.NormalizeRoute(form["route"]);

        if (!StoragePaths.IsSafeSegment(route))
        {
            return Results.BadRequest(new { ok = false, error = "Invalid route" });
        }

        var groups = await ReadJsonAsync<List<GroupModel>>(groupsFile) ?? new List<GroupModel>();
        var beforeCount = groups.Count;
        groups = groups.Where(g => !string.Equals(g.Route, route, StringComparison.OrdinalIgnoreCase)).ToList();
        if (groups.Count == beforeCount)
        {
            return Results.NotFound(new { ok = false, error = "Group not found" });
        }

        var sections = await ReadJsonAsync<List<SectionModel>>(sectionsFile) ?? new List<SectionModel>();
        var linkedSections = sections.Where(s => string.Equals(s.GroupRoute, route, StringComparison.OrdinalIgnoreCase)).ToList();
        sections = sections.Where(s => !string.Equals(s.GroupRoute, route, StringComparison.OrdinalIgnoreCase)).ToList();

        foreach (var section in linkedSections)
        {
            var routeGuidesPath = Path.Combine(guidesRoot, $"{section.Route}.json");
            if (File.Exists(routeGuidesPath))
            {
                File.Delete(routeGuidesPath);
            }

            var routeUploadsPath = Path.Combine(uploadsRoot, section.Route);
            if (Directory.Exists(routeUploadsPath))
            {
                Directory.Delete(routeUploadsPath, recursive: true);
            }
        }

        await WriteJsonAsync(groupsFile, groups);
        await WriteJsonAsync(sectionsFile, sections);

        return Results.Ok(new { ok = true });
    })
    .RequireAuthorization();

app.MapDelete("/api/docs/guides/{route}/{id}", async (string route, string id) =>
    {
        route = StoragePaths.NormalizeRoute(route);
        if (!StoragePaths.IsSafeSegment(route) || string.IsNullOrWhiteSpace(id))
        {
            return Results.BadRequest(new { ok = false, error = "Invalid route or id" });
        }

        var routeGuidesPath = Path.Combine(guidesRoot, $"{route}.json");
        var guides = await ReadJsonAsync<List<GuideModel>>(routeGuidesPath) ?? new List<GuideModel>();
        var guide = guides.FirstOrDefault(g => g.Id == id);
        if (guide is null)
        {
            return Results.NotFound(new { ok = false, error = "Guide not found" });
        }

        var guideFolder = Path.Combine(uploadsRoot, route, guide.Number.ToString());
        if (Directory.Exists(guideFolder))
        {
            Directory.Delete(guideFolder, recursive: true);
        }

        guides = guides.Where(g => g.Id != id).ToList();
        await WriteJsonAsync(routeGuidesPath, guides);

        return Results.Ok(new { ok = true });
    })
    .RequireAuthorization();

app.MapPost("/api/docs/guides/delete", async (HttpContext http) =>
    {
        var form = await http.Request.ReadFormAsync();
        var route = StoragePaths.NormalizeRoute(form["route"]);
        var id = form["id"].ToString().Trim();

        if (!StoragePaths.IsSafeSegment(route) || string.IsNullOrWhiteSpace(id))
        {
            return Results.BadRequest(new { ok = false, error = "Invalid route or id" });
        }

        var routeGuidesPath = Path.Combine(guidesRoot, $"{route}.json");
        var guides = await ReadJsonAsync<List<GuideModel>>(routeGuidesPath) ?? new List<GuideModel>();
        var guide = guides.FirstOrDefault(g => g.Id == id);
        if (guide is null)
        {
            return Results.NotFound(new { ok = false, error = "Guide not found" });
        }

        var guideFolder = Path.Combine(uploadsRoot, route, guide.Number.ToString());
        if (Directory.Exists(guideFolder))
        {
            Directory.Delete(guideFolder, recursive: true);
        }

        guides = guides.Where(g => g.Id != id).ToList();
        await WriteJsonAsync(routeGuidesPath, guides);

        return Results.Ok(new { ok = true });
    })
    .RequireAuthorization();

app.MapFallback(() =>
{
    var indexPath = Path.Combine(app.Environment.WebRootPath ?? Path.Combine(app.Environment.ContentRootPath, "wwwroot"), "index.html");
    if (!File.Exists(indexPath))
    {
        return Results.NotFound();
    }

    return Results.File(indexPath, "text/html");
});

app.Run();

static async Task<T?> ReadJsonAsync<T>(string filePath)
{
    if (!File.Exists(filePath))
    {
        return default;
    }

    await using var stream = File.OpenRead(filePath);
    return await JsonSerializer.DeserializeAsync<T>(stream);
}

static async Task WriteJsonAsync<T>(string filePath, T value)
{
    Directory.CreateDirectory(Path.GetDirectoryName(filePath)!);
    await using var stream = File.Create(filePath);
    await JsonSerializer.SerializeAsync(stream, value, new JsonSerializerOptions
    {
        WriteIndented = true,
    });
}

static string? DetectMediaType(string? contentType, string fileName)
{
    var extension = Path.GetExtension(fileName).ToLowerInvariant();
    if (extension == ".gif")
    {
        return "gif";
    }

    if (extension == ".mp4" || extension == ".webm" || extension == ".mov" || extension == ".m4v")
    {
        return "video";
    }

    var ct = (contentType ?? string.Empty).ToLowerInvariant();
    if (ct.StartsWith("video/"))
    {
        return "video";
    }

    if (ct == "image/gif")
    {
        return "gif";
    }

    if (ct.StartsWith("image/"))
    {
        return "image";
    }

    return null;
}

static string ResolveExtension(string fileName, string mediaType)
{
    if (mediaType == "video")
    {
        return ".mp4";
    }

    var ext = Path.GetExtension(fileName);
    if (!string.IsNullOrWhiteSpace(ext))
    {
        return ext.ToLowerInvariant();
    }

    return mediaType == "gif" ? ".gif" : ".jpg";
}

static bool TryNormalizeVideoInPlace(string filePath)
{
    var tempPath = Path.Combine(
        Path.GetDirectoryName(filePath) ?? string.Empty,
        $"{Path.GetFileNameWithoutExtension(filePath)}.normalized.mp4"
    );

    try
    {
        if (File.Exists(tempPath))
        {
            File.Delete(tempPath);
        }

        var ffmpeg = new ProcessStartInfo
        {
            FileName = "ffmpeg",
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true,
        };

        ffmpeg.ArgumentList.Add("-y");
        ffmpeg.ArgumentList.Add("-i");
        ffmpeg.ArgumentList.Add(filePath);
        ffmpeg.ArgumentList.Add("-map");
        ffmpeg.ArgumentList.Add("0:v:0");
        ffmpeg.ArgumentList.Add("-map");
        ffmpeg.ArgumentList.Add("0:a?");
        ffmpeg.ArgumentList.Add("-vf");
        ffmpeg.ArgumentList.Add("scale=1920:-2:force_original_aspect_ratio=decrease,fps=30");
        ffmpeg.ArgumentList.Add("-c:v");
        ffmpeg.ArgumentList.Add("libx264");
        ffmpeg.ArgumentList.Add("-preset");
        ffmpeg.ArgumentList.Add("veryfast");
        ffmpeg.ArgumentList.Add("-profile:v");
        ffmpeg.ArgumentList.Add("high");
        ffmpeg.ArgumentList.Add("-level");
        ffmpeg.ArgumentList.Add("4.1");
        ffmpeg.ArgumentList.Add("-pix_fmt");
        ffmpeg.ArgumentList.Add("yuv420p");
        ffmpeg.ArgumentList.Add("-movflags");
        ffmpeg.ArgumentList.Add("+faststart");
        ffmpeg.ArgumentList.Add("-c:a");
        ffmpeg.ArgumentList.Add("aac");
        ffmpeg.ArgumentList.Add("-b:a");
        ffmpeg.ArgumentList.Add("128k");
        ffmpeg.ArgumentList.Add(tempPath);

        using var process = Process.Start(ffmpeg);
        if (process is null)
        {
            return false;
        }

        if (!process.WaitForExit(300000) || process.ExitCode != 0)
        {
            if (!process.HasExited)
            {
                process.Kill(entireProcessTree: true);
            }

            if (File.Exists(tempPath))
            {
                File.Delete(tempPath);
            }

            return false;
        }

        if (!File.Exists(tempPath))
        {
            return false;
        }

        var info = new FileInfo(tempPath);
        if (info.Length == 0)
        {
            File.Delete(tempPath);
            return false;
        }

        File.Delete(filePath);
        File.Move(tempPath, filePath);
        return true;
    }
    catch
    {
        if (File.Exists(tempPath))
        {
            File.Delete(tempPath);
        }

        return false;
    }
}

static bool IsTrustedAssetRequest(HttpRequest request)
{
    var allowedOrigins = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
    {
        "https://ecss-sa.com",
        "https://docs.ecss-sa.com",
        "http://localhost:4200",
        "http://127.0.0.1:4200",
    };

    var origin = request.Headers.Origin.ToString();
    if (!string.IsNullOrWhiteSpace(origin) && allowedOrigins.Contains(origin))
    {
        return true;
    }

    var referer = request.Headers.Referer.ToString();
    if (Uri.TryCreate(referer, UriKind.Absolute, out var refererUri))
    {
        var normalizedReferer = $"{refererUri.Scheme}://{refererUri.Host}{(refererUri.IsDefaultPort ? string.Empty : $":{refererUri.Port}")}";
        if (allowedOrigins.Contains(normalizedReferer))
        {
            return true;
        }
    }

    var fetchSite = request.Headers["Sec-Fetch-Site"].ToString();
    return string.IsNullOrWhiteSpace(fetchSite) || fetchSite is "same-origin" or "same-site" or "none";
}

static byte[] ResolveSigningKeyBytes(string configuredTokenKey)
{
    if (string.IsNullOrWhiteSpace(configuredTokenKey))
    {
        throw new InvalidOperationException("AdminAuth:TokenKey is required.");
    }

    var normalized = configuredTokenKey.Trim();
    byte[] keyBytes;

    if (normalized.StartsWith("base64:", StringComparison.OrdinalIgnoreCase))
    {
        var payload = normalized[7..].Trim();
        try
        {
            keyBytes = Convert.FromBase64String(payload);
        }
        catch (FormatException)
        {
            throw new InvalidOperationException("AdminAuth:TokenKey base64 value is invalid.");
        }
    }
    else
    {
        keyBytes = Encoding.UTF8.GetBytes(normalized);
    }

    if (keyBytes.Length < 256)
    {
        throw new InvalidOperationException("AdminAuth:TokenKey must be at least 2048-bit (256 bytes).");
    }

    return keyBytes;
}

public sealed class LoginRequest
{
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

public sealed class ReorderRequest
{
    public List<ReorderItem> Orders { get; set; } = new();
}

public sealed class ReorderItem
{
    public string Route { get; set; } = string.Empty;
    public int Order { get; set; }
}
//#endregion Edit By AI
