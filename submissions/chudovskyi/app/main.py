import uvicorn

from config import settings


def main():
    uvicorn.run(
        app="server.server:app",
        host=settings.run.host,
        port=settings.run.port,
        workers=settings.run.workers,
        reload=settings.run.reload,
    )


if __name__ == "__main__":
    main()
