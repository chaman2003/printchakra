"""
Run all document processing tests
"""
import os
import sys
import subprocess

TEST_DIR = os.path.dirname(os.path.abspath(__file__))

TESTS = [
    ("test_simple.py", "Simple Processing Test"),
    ("test_pipeline.py", "Pipeline Generation Test"),
]


def run_test(script_name: str, description: str) -> bool:
    """Run a single test script"""
    print(f"\n{'='*60}")
    print(f"RUNNING: {description}")
    print(f"Script: {script_name}")
    print('='*60)
    
    script_path = os.path.join(TEST_DIR, script_name)
    
    try:
        result = subprocess.run(
            [sys.executable, script_path],
            cwd=TEST_DIR,
            capture_output=True,
            text=True,
            timeout=120
        )
        
        print(result.stdout)
        if result.stderr:
            print(f"STDERR:\n{result.stderr}")
        
        return result.returncode == 0
    except subprocess.TimeoutExpired:
        print("ERROR: Test timed out")
        return False
    except Exception as e:
        print(f"ERROR: {e}")
        return False


def main():
    print("\n" + "="*60)
    print("DOCUMENT PROCESSING TEST SUITE")
    print("="*60)
    
    results = {}
    
    for script, description in TESTS:
        results[script] = run_test(script, description)
    
    # Summary
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    
    passed = 0
    for script, success in results.items():
        status = "✓ PASSED" if success else "✗ FAILED"
        print(f"  {status}: {script}")
        if success:
            passed += 1
    
    print(f"\nTotal: {passed}/{len(results)} tests passed")
    
    return passed == len(results)


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
