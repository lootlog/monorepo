#!/bin/bash

echo "Copying entrypoint to dist";

# Default environment
default_env="develop"
# Use provided ENVIRONMENT variable or default to 'develop'
env=${ENVIRONMENT:-$default_env}

echo "Using environment x: $env";

# Copy the template file to the dist directory
cp src/templates/entrypoint.js dist/@lootlog/entrypoint.user.js;