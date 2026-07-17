# Frontend

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 22.0.7.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

## Publish Layout (Root + Api Folder)

Running:

```bash
npm run release
```

Produces this structure:

```text
dist/DocsNexusPMS/
	index.html
	main-*.js
	styles-*.css
	web.config
	Api/
		NexusPms.Api
		appsettings.json
		web.config
		public/
			data/
			uploads/
```

Routing model:

```text
Frontend: http://localhost:2408 or https://doc.ecss-sa.com/
API:      http://localhost:2408/api or https://doc.ecss-sa.com/api
```

IIS notes:

1. Deploy `dist/DocsNexusPMS` as the website root.
2. Keep API running from `dist/DocsNexusPMS/Api` on `127.0.0.1:2408`.
3. Root `web.config` proxies `/api`, `/data`, and `/uploads` to `127.0.0.1:2408`.
4. Ensure IIS modules `URL Rewrite` and `Application Request Routing (ARR)` are installed and ARR proxy is enabled.
