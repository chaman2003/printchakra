# Tests

This directory contains all test files for the PrintChakra backend.

## Test Files

- `test_api.py` - API endpoint tests
- `test_conversion.py` - File conversion tests
- `test_sequential_processing.py` - Pipeline processing tests

## Running Tests

```bash
# Run all tests
python -m pytest

# Run specific test file
python tests/test_api.py

# Run with verbose output
python -m pytest -v
```

## Test Coverage

To generate coverage reports:
```bash
pytest --cov=modules tests/
```
