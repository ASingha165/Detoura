from firebase_client import get_firestore_client

db = get_firestore_client()
users = list(db.collection('users').stream())
print(f"Total user docs: {len(users)}")
for u in users:
    print(f"User ID: {u.id}")
    print("Data:", u.to_dict())
    subcollections = list(u.reference.collections())
    print("Subcollections:", [sc.id for sc in subcollections])
    for sc in subcollections:
        docs = list(sc.stream())
        print(f"  Docs in {sc.id}: {len(docs)}")
        for d in docs:
            print(f"    {d.id} => {d.to_dict()}")
