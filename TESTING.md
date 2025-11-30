# Running Tests Locally

This project includes unit tests (Jest) and End-to-End tests (Playwright).

## Recommended Local Setup (conda environment)

1. Activate your conda environment:

```bash
conda activate coffee
```

2. Install project dependencies and download Playwright browsers (postinstall will try to install Chromium automatically):

```bash
npm install
```

3. Install system libraries required by the Chromium binary inside your conda environment (Playwright may require system libs that are not included in conda by default). This example installs core libraries via conda-forge:

```bash
conda install -c conda-forge nspr nss gtk3 alsa-lib -y
```

4. Ensure the conda `lib` directory is in your LD_LIBRARY_PATH so the Chromium binary can find shared libraries:

```bash
export LD_LIBRARY_PATH="$CONDA_PREFIX/lib:$LD_LIBRARY_PATH"
```

5. Run unit + e2e tests locally:

```bash
npm run ci
```

Alternative: If you have `sudo` and prefer to install OS dependencies via apt (Debian/Ubuntu/WSL), run:

```bash
sudo apt update && sudo apt install -y libnss3 libnspr4 libxss1 libasound2 libatk1.0-0 libcups2 libxrandr2 libx11-xcb1 libgconf-2-4 libxtst6 libxi6 libgbm1 libgtk-3-0
npx playwright install --with-deps
```

## Running only unit tests

```bash
npm run test:unit
```

## Running only e2e tests

```bash
npm run test:e2e
```
