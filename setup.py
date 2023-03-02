#!/usr/bin/env python3
"""BEMServer UI"""

from setuptools import setup, find_packages


EXTRAS_REQUIRE = {
    "lint": [
        "flake8>=4.0.1",
        "flake8-bugbear>=22.1.11",
        "pre-commit>=2.17.0",
    ],
}
EXTRAS_REQUIRE["dev"] = EXTRAS_REQUIRE["lint"]


# Get the long description from the README file
with open("README.rst", encoding="utf-8") as f:
    long_description = f.read()


setup(
    name="bemserver-ui",
    version="0.4.1",
    description="BEMServer web interface",
    long_description=long_description,
    long_description_content_type="text/x-rst",
    url="https://github.com/BEMServer/bemserver-ui",
    author="NOBATEK/INEF4",
    author_email="dfrederique@nobatek.inef4.com",
    license="AGPLv3+",
    # keywords=[
    # ],
    # See https://pypi.python.org/pypi?%3Aaction=list_classifiers
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Science/Research",
        "Topic :: Scientific/Engineering",
        "Programming Language :: Python :: 3.7",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        (
            "License :: OSI Approved :: "
            "GNU Affero General Public License v3 or later (AGPLv3+)"
        ),
    ],
    python_requires=">=3.7",
    install_requires=[
        "flask>=2.2.2",
        "python-dotenv>=0.21.0",
        "bemserver-api-client>=0.12.1,<0.13.0",
    ],
    extras_require=EXTRAS_REQUIRE,
    packages=find_packages(exclude=["tests*"]),
    include_package_data=True,
)
