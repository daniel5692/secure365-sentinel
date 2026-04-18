**Welcome to your Base44 project**

## About

View and edit your app on [Base44.com](http://Base44.com).

This project contains everything you need to run your app locally and push updates that can be published from Base44.

## Run locally

1. Clone the repository.
2. Navigate to the project directory.
3. Install dependencies:

```bash
npm install
```

4. Copy the example environment file and fill in your Base44 values:

```bash
cp .env.example .env.local
```

Required variables:

```bash
VITE_BASE44_APP_ID=your_app_id
VITE_BASE44_APP_BASE_URL=https://your-project.base44.app
```

5. Start the app:

```bash
npm run dev
```

## Upload / publish to Base44

1. Commit and push your changes to the connected GitHub repository.
2. Open your project on [Base44.com](http://Base44.com).
3. Click **Publish** to deploy the latest synced version.

> Note: Base44 publish requires access to the Base44 workspace connected to this app.

## Docs & Support

- Documentation: <https://docs.base44.com/Integrations/Using-GitHub>
- Support: <https://app.base44.com/support>
