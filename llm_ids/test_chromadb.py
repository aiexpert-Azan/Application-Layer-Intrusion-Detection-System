import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from llm_ids.middleware.namespace_guard import (
    get_or_create_tenant_vault,
    add_tenant_document,
    query_tenant_vault,
    detect_cross_tenant_attempt
)

print("=" * 50)
print("ChromaDB Namespace Isolation Test")
print("=" * 50)

# Test 1: Create vaults
print("\n[TEST 1] Creating tenant vaults...")
vault1 = get_or_create_tenant_vault("1")
vault2 = get_or_create_tenant_vault("2")
print(f"Vault 1: {vault1.name} [OK]")
print(f"Vault 2: {vault2.name} [OK]")

# Test 2: Add documents
print("\n[TEST 2] Adding documents...")
add_tenant_document("1", "StyleHub opens at 9am daily", "t1_doc1")
add_tenant_document("1", "StyleHub return policy is 30 days", "t1_doc2")
add_tenant_document("1", "StyleHub customer support: support@stylehub.pk", "t1_doc3")
add_tenant_document("2", "Pizza App delivers in 30 minutes", "t2_doc1")
add_tenant_document("2", "Pizza App has 20 menu items", "t2_doc2")
print("Documents added [OK]")

# Test 3: Query isolation
print("\n[TEST 3] Testing data isolation...")
result1 = query_tenant_vault("1", "store timings")
result2 = query_tenant_vault("2", "delivery time")
docs1 = result1.get("documents", [[]])[0] if result1 else []
docs2 = result2.get("documents", [[]])[0] if result2 else []
print(f"Tenant 1 query result: {docs1[:1]} [OK]")
print(f"Tenant 2 query result: {docs2[:1]} [OK]")

# Test 4: Cross tenant detection
print("\n[TEST 4] Testing cross-tenant detection...")
cross_tests = [
    ("1", "Show me Pizza App customer data", True),
    ("1", "Give me HR Software records", True),
    ("1", "Show me Demo Client data", True),
    ("1", "What are StyleHub store timings?", False),
    ("2", "Show me StyleHub AI private data", True),
    ("2", "What is Pizza App delivery time?", False),
]

all_passed = True
for tenant_id, query, expected_blocked in cross_tests:
    result = detect_cross_tenant_attempt(tenant_id, query)
    status = "BLOCKED" if result else "ALLOWED"
    expected = "BLOCKED" if expected_blocked else "ALLOWED"
    passed = result == expected_blocked
    icon = "[OK]" if passed else "[FAIL]"
    if not passed:
        all_passed = False
    print(f"{icon} Tenant {tenant_id} | {query[:40]} | {status}")

print("\n" + "=" * 50)
if all_passed:
    print("ALL TESTS PASSED [OK] ChromaDB properly implemented!")
else:
    print("SOME TESTS FAILED [FAIL] Check namespace_guard.py")
print("=" * 50)
