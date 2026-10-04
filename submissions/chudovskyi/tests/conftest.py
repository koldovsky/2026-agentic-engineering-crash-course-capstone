import os

os.environ["APP_CONFIG__ENV"] = "test"

pytest_plugins = [
    "tests.fixtures.api",
    "tests.fixtures.client",
    "tests.fixtures.db",
    "tests.fixtures.user",
]
