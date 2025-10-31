name: Simple CI

on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        
    - name: Install and test backend
      working-directory: ./backend
      run: |
        npm ci
        npm test
        
    - name: Check frontend files
      run: |
        [ -f "./frontend/index.html" ] && echo "Frontend OK" || exit 1
        [ -f "./frontend/dashboard.html" ] && echo "Dashboard OK" || exit 1
        
    - name: Build Docker
      run: docker build -t writeitdown-app .