# Developer Guide – LeaseMate Repo

## Clone the Repository

Open your terminal and run:

```bash
git clone https://github.com/OlaRedaAbdulrazeq/LEASEMATE.git
cd LEASEMATE
```

## Switch to the Development Branch

Make sure you’re working on the main development branch called `before-main`:

```bash
git checkout before-main
git pull origin before-main
```

## Install Dependencies

### For Frontend

```bash
cd frontend
npm install
```

### For Backend

```bash
cd ../backend
npm install
```

## Create Your Own Feature Branch

Create a new branch for your feature or task, based off `before-main`. Use a clear, descriptive name:

```bash
git checkout -b feature/your-branch-name
```

> مثال لاسم البرانش:
>
> `feature/add-login-page`

## Make Your Changes

Edit or add files as needed in your feature branch.

## Stage, Commit, and Push Your Changes

It’s recommended to add each file separately for better traceability and easier debugging if an issue arises.

```bash
git add path/to/your/file
git commit -m "وصف مختصر للتغييرات اللي عملتها"
git push origin feature/your-branch-name
```

> مثال:
>
> ```bash
> git add frontend/src/components/LoginForm.jsx
> git commit -m "add login form component"
> git push origin feature/add-login-page
> ```

## Create a Pull Request (PR)

1. Go to the [GitHub repository](https://github.com/OlaRedaAbdulrazeq/LEASEMATE).
2. You’ll see a prompt to open a PR for your pushed branch.
3. Open a PR targeting the `before-main` branch.
4. Add a clear title and description of your changes.
5. Request reviewers if needed.

## After PR Approval

Once your PR is approved and merged:

```bash
git checkout before-main
git pull origin before-main
```
