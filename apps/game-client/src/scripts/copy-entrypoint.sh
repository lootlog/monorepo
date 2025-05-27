#!/bin/bash

echo "Copying entrypoint to dist";

# Default environment
default_env="prod"
# Use provided ENVIRONMENT variable or default to 'develop'
env=${ENVIRONMENT:-$default_env}

echo "Using environment: $env";

# Copy the template file to the dist directory
cp src/templates/entrypoint.js dist/entrypoint.user.js;

# Insert environment variable into the copied file at line 23
if [[ "$OSTYPE" == "darwin"* ]]; then
  sed -i '' -e '23i\
  const env = "'$env'";
  ' dist/entrypoint.user.js
else
  sed -i -e '23i\
  const env = "'$env'";
  ' dist/entrypoint.user.js
fi
