Prompt Manager API + Agentic Engineering
# Prompt Manager API

The Prompt Manager API is a fully asynchronous RESTful API for efficient management of personal prompts.

The project combines the high performance of the modern **FastAPI** framework, the flexibility of **SQLAlchemy 2.0**, the standardized structure of **JSON:API**, and integration with AI.

Among other things, the application also provides the ability to send a request directly to the **Gemini** neural network via a separate API,
receiving a response, and saving them to the database.

## 📊 Status of Workflows

[![Tests in Docker](https://github.com/OleksiiChudovskyi/prompt_manager_api/actions/workflows/tests_docker.yml/badge.svg?branch=main)](https://github.com/OleksiiChudovskyi/prompt_manager_api/actions/)
[![Tests in VM](https://github.com/OleksiiChudovskyi/prompt_manager_api/actions/workflows/tests_vm.yml/badge.svg?branch=main)](https://github.com/OleksiiChudovskyi/prompt_manager_api/actions/)

---

## 🌐 Live Demo (Production)

The project is deployed and running in a production environment on Railway. You can read the interactive documentation and test the API at:
👉 **[Production version Prompt Manager API](https://prompt-manager.up.railway.app/docs)**

## 🚀 Project Features

- **Asynchronous Architecture:** Fully non-blocking I/O based on FastAPI and the asynchronous SQLAlchemy driver (`asyncpg`).
- **JSON:API 1.0 Specification:** `FastAPI-JSONAPI` integration provides a standardized response structure, powerful filtering, sorting, and pagination out of the box.
- **Gemini AI Integration:** A dedicated intelligent endpoint for sending prompts to the Gemini neural network, receiving responses, and automatically saving them to the database.
- **Advanced Authentication:** Reliable user management (registration, verification, endpoint protection) based on `FastAPI Users` using JWT tokens.
- **Complex Model Relationships:** Structured relational relationships between users, prompts, categories, and tags.
- **Modern dependency management:** Using the ultra-fast `uv` package manager.
- **Environment security:** Clean separation of configurations with separate `.env.dev`, `.env.test` and `.env.prod` files.
- **Code quality and CI/CD:** Automated processes via GitHub Actions, including testing, as well as linting and formatting with `Ruff`.

## 🛠️ Technology Stack

- **Language:** Python 3.11+
- **Framework:** FastAPI 0.135.1+
- **Data Validation:** Pydantic 2.13
- **ORM & Database:** SQLAlchemy 2.0 (Async) + PostgreSQL
- **Dependency Manager:** uv
- **Migrations:** Alembic
- **Testing**: Pytest, Coverage, Mock
- **Authentication:** FastAPI Users (JWT Strategy) (https://fastapi-users.github.io/)
- **API Standardization:** FastAPI-JSONAPI (https://mts-ai.github.io/FastAPI-JSONAPI/)
- **AI Integration:** Google Gemini SDK (https://ai.google.dev/gemini-api/docs)

---

## 📝 Verisya Repository & Open Source

This repository was created to demonstrate the project architecture and development skills as transparently as possible.

- **Full source code:** The [Prompt Manager GitHub repository](https://github.com/OleksiiChudovskyi/prompt_manager_api) has published all the open source code, architectural structure, and configuration files and folders that are usually added to `.gitignore` and `.dockerignore` files.
This is done intentionally so that you can get a detailed look at the full development cycle of the project.
- **Data security:** To prevent the leakage of any sensitive information (private API keys, authentication tokens, database passwords), the history of previous commits has been completely removed from this version of the repository.
All current configuration files contain only safe demo values.

## 📦 Containerization and Environments

The project has several Docker Compose configurations adapted to different usage scenarios:

1. **Development:** Supports `docker compose watch` technology for real-time Hot Reloading of code without rebuilding images.
2. **Testing:** Separate isolated test execution based on `Pytest` and calculation of code coverage using `Coverage`.
3. **Production:** Maximum security version using Docker Secrets, optimized images and **NGINX** reverse proxy.

---

## 💻 Quick Start (Local Development)

### Prerequisites
Make sure you have Git and Docker installed on your computer (with Docker Compose v2.22.0+ to support watch mode).

### 1. Cloning the project
```bash
git clone https://github.com/OleksiiChudovskyi/prompt_manager_api.git
cd prompt_manager_api
```

### 2. Setting environment variables
Create a `.env.dev` configuration file in the `app/config/envs/` folder based on the existing `.env.template` template:
```bash
cp app/config/envs/.env.template app/config/envs/.env.dev
```
Then open the created `.env.dev` file and fill it with the current data.

Or use the existing `.env.dev` file in `app/config/envs/`

For a quick local start, make sure you have the correct database connection settings and your API key.

### 3. Starting containers (Auto-initialization and Hot Reloading)
Run Docker Compose in development mode:
```bash
docker compose -f compose.dev.yml up --watch
```
**When starting containers, the following will automatically happen:**
1. Waiting for the PostgreSQL database to be ready.
2. Automatically applying all Alembic migrations.
3. Automatically seeding the database with initial/test data.

Thanks to the `--watch` flag, any subsequent changes to local code files will be instantly synchronized into the container without rebuilding the images.

After the launch is complete, the local API documentation (Swagger UI) will be available at: `http://localhost:8000/docs`.

---

## 🧪 Testing and Quality Control

### Running Tests in Docker
To run asynchronous `Pytest` tests and check `Coverage` coverage in an isolated test environment, use the command:
```bash
docker compose -f compose.test.yml up --build --abort-on-container-exit
```

### CI/CD Workflow (GitHub Actions)
Two automated scripts (Workflows) are configured in the repository:
1. **Docker Compose Tests:** Launches a test container on each Pull Request / Push to verify the integrity of the infrastructure.
2. **Comprehensive Code Check:** Runs on a GitHub Runner virtual machine and performs:
- Testing (Pytest).
- Static analysis and linting (`Ruff Check`).
- Code formatting check (`Ruff Format`).

---

## 🏗️ Production Deployment

To run a stable production version, protected by a **NGINX** reverse proxy and the built-in **Docker Secrets** mechanism, you need to perform the following steps:

### 1. Create a configuration file
Create a `.env.prod` file in the `app/config/envs/` folder based on the existing `.env.template` template:
```bash
cp app/config/envs/.env.template app/config/envs/.env.prod
```
Open the created file and fill it with secure production values (disable `DEBUG`, set strong passwords, generate a stable `SECRET_KEY` and specify your production `GEMINI_API_KEY`).

### 2. Initialize environment variables
Before running Docker Compose, be sure to export the environment variables to the current terminal session using the installation script:
```bash
source ./sets/set_env.sh
```

### 3. Start the production stack
Run the containers in the background (detached mode).
The automatic image build process is optimized for minimal size and maximum security:
```bash
docker compose -f compose.prod.yml up -d --build
```

---

## 📌 Basic API Endpoints (v1)

Thanks to the **JSON:API** specification, parameters like `?filter[...]`, `?sort=...` and `?page[size]=...` can be applied to basic resources (Prompts, Categories, Tags).

### 🧠 Integration with Gemini AI
- **`POST /api/v1/gemini/request`** — A specific endpoint for sending your text request to the Gemini neural network. The service generates an AI response and automatically saves the results to the database.
- **Request Body:**
```json
    {
    "title": "string",
    "pmpt_request": "string",
    "category_id": 1
    }
```

### 🩺 Health
- **`GET /api/v1/health`** — Public health check (no authentication). Returns the service status, name, version and uptime in seconds.
- **Response:**
```json
    {
    "status": "ok",
    "service": "Prompt Manager",
    "version": "1.0.0",
    "uptime_seconds": 42
    }
```

### ℹ️ Info
- **`GET /api/v1/info`** — Public service info (no authentication). Returns the service status, name, version, API version and uptime in seconds.
- **Response:**
```json
    {
    "status": "ok",
    "service": "Prompt Manager",
    "version": "1.0.0",
    "api_version": "v1",
    "uptime_seconds": 42.5
    }
```

### 🔐 Authentication & Users (`FastAPI Users`)
- `POST /api/v1/auth/register` — Register a new account.
- `POST /api/v1/auth/jwt/login` — Log in, get JWT token.
- `POST /api/v1/auth/jwt/login` — Log out (deactivate token).
- `GET /api/v1/users/me` — Get the profile of the currently authenticated user.

### 📝 Prompts and Content Management (`JSON:API`)
- `GET /api/v1/prompts` — Get a list of saved prompts with support for filtering, sorting, and pagination.
- `POST /api/v1/prompts` — Create a new prompt entry manually.
- `GET/PATCH/DELETE /api/v1/prompts/{id}` — Work with a specific prompt by its ID.
- `GET/POST /api/v1/categories` — Manage prompt categories.
- `GET/POST /api/v1/tags` — Manage tags for flexible classification.

---

## 📝 License

This project is open source and distributed under the [MIT License](LICENSE).

## 👥 Author

**Oleksii Chudovskyi** — [oleksii.chudovskyi@gmail.com](mailto:oleksii.chudovskyi@gmail.com)