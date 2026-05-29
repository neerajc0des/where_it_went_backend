const data = {
    "success": true,
    "data": {
        "defaultCategories": [
            {
                "id": "d331e9be-0095-409e-9b80-28f94b86fa72",
                "name": "Others",
                "icon": "ellipsis",
                "type": "EXPENSE",
                "isDefault": true,
                "createdAt": "2026-05-29T12:47:52.138Z"
            },
            {
                "id": "f62d0844-f74d-466a-a812-106c14aaf227",
                "name": "Food & Dining",
                "icon": "utensils",
                "type": "EXPENSE",
                "isDefault": true,
                "createdAt": "2026-05-29T12:47:52.138Z"
            },
            {
                "id": "e28714ff-2132-4796-81c7-a08e9efb3cfe",
                "name": "Groceries",
                "icon": "shopping-basket",
                "type": "EXPENSE",
                "isDefault": true,
                "createdAt": "2026-05-29T12:47:52.138Z"
            },
            {
                "id": "6f53aa0f-a28d-4014-9bb1-e5c069f8e049",
                "name": "Rent & Housing",
                "icon": "house",
                "type": "EXPENSE",
                "isDefault": true,
                "createdAt": "2026-05-29T12:47:52.138Z"
            },
            {
                "id": "99245dbd-aebd-4978-b684-c0eaedb080f5",
                "name": "Utilities",
                "icon": "zap",
                "type": "EXPENSE",
                "isDefault": true,
                "createdAt": "2026-05-29T12:47:52.138Z"
            },
            {
                "id": "19a571b4-0452-4b64-9e0c-627a8701fbcb",
                "name": "Transportation",
                "icon": "car",
                "type": "EXPENSE",
                "isDefault": true,
                "createdAt": "2026-05-29T12:47:52.138Z"
            },
            {
                "id": "90292ca3-a87a-45b4-97fc-3e398e5d6c53",
                "name": "Shopping",
                "icon": "shopping-bag",
                "type": "EXPENSE",
                "isDefault": true,
                "createdAt": "2026-05-29T12:47:52.138Z"
            },
            {
                "id": "56b61e04-c4b9-4ba1-bd6a-5b916812d5ae",
                "name": "Entertainment",
                "icon": "film",
                "type": "EXPENSE",
                "isDefault": true,
                "createdAt": "2026-05-29T12:47:52.138Z"
            },
            {
                "id": "f4f115fa-72c3-4b4e-b457-2d3ebae829d8",
                "name": "Medical & Healthcare",
                "icon": "heart-pulse",
                "type": "EXPENSE",
                "isDefault": true,
                "createdAt": "2026-05-29T12:47:52.138Z"
            },
            {
                "id": "624e6bce-e318-422c-99ae-2d3777a19037",
                "name": "Subscriptions & OTT",
                "icon": "tv",
                "type": "EXPENSE",
                "isDefault": true,
                "createdAt": "2026-05-29T12:47:52.138Z"
            },
            {
                "id": "c1725165-30fe-45ce-81ed-a72bd6d9aad6",
                "name": "Education",
                "icon": "graduation-cap",
                "type": "EXPENSE",
                "isDefault": true,
                "createdAt": "2026-05-29T12:47:52.138Z"
            },
            {
                "id": "93bc3e42-a8f8-4c60-b89e-687b5738b339",
                "name": "Personal Care",
                "icon": "sparkles",
                "type": "EXPENSE",
                "isDefault": true,
                "createdAt": "2026-05-29T12:47:52.138Z"
            },
            {
                "id": "da3d9241-b54a-408d-b9df-ab6710f4bc83",
                "name": "Salary",
                "icon": "banknote",
                "type": "INCOME",
                "isDefault": true,
                "createdAt": "2026-05-29T12:47:52.138Z"
            },
            {
                "id": "5ea60cda-68fd-49c1-8c47-c5890ea7276a",
                "name": "Freelance",
                "icon": "laptop",
                "type": "INCOME",
                "isDefault": true,
                "createdAt": "2026-05-29T12:47:52.138Z"
            },
            {
                "id": "519e5fc2-6bed-41af-9005-f6b43e8f7483",
                "name": "Investments",
                "icon": "trending-up",
                "type": "EXPENSE",
                "isDefault": true,
                "createdAt": "2026-05-29T12:47:52.138Z"
            }
        ],
        "customCategories": [
            {
                "id": "cc6ea0c3-6f64-48d8-8cc6-d72d5e8b8989",
                "name": "education",
                "icon": null,
                "type": "EXPENSE",
                "isDefault": false,
                "createdAt": "2026-05-24T17:33:11.269Z"
            }
        ]
    }
}

const printDefaultCategories = () => {
    console.log("Default Categories:");
    let sn = 1;
    data.data.defaultCategories.forEach(category => {
        console.log(`${sn}: ${category.name}`);
        sn++;
    })
}

printDefaultCategories();