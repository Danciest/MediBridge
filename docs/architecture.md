# MediBridge architecture

## System architecture

```mermaid
flowchart LR
  Browser[Browser: index.html and app.js] -->|JSON over HTTPS in production| API[Express API]
  API --> Auth[JWT and database-backed RBAC]
  API --> Logic[Medicine, request, reward, and report services]
  Logic --> DB[(MongoDB)]
```

## Data model (ER)

```mermaid
erDiagram
  USER ||--o{ MEDICINE : donates
  USER ||--o{ REQUEST : submits
  USER ||--o{ REWARD : owns
  USER ||--o{ ISSUE_REPORT : reports
  MEDICINE ||--o{ REWARD : earns
  MEDICINE o|--o{ REQUEST : fulfills
  USER {
    ObjectId id PK
    string name
    string email UK
    string role
    int rewardPoints
    boolean active
  }
  MEDICINE {
    ObjectId id PK
    ObjectId sourceId FK
    string name
    int quantity
    date expiryDate
    string status
    string verificationStatus
  }
  REQUEST {
    ObjectId id PK
    ObjectId requester FK
    ObjectId matchedMedicine FK
    string medicineName
    int quantity
    string status
  }
  REWARD {
    ObjectId id PK
    ObjectId user FK
    ObjectId medicine FK
    int points
    string type
    string idempotencyKey
  }
  ISSUE_REPORT {
    ObjectId id PK
    ObjectId reporter FK
    ObjectId relatedMedicine FK
    ObjectId relatedRequest FK
    string status
  }
```

The legacy `Donation` model is not currently used by a route; donation records are represented by `Medicine` documents with source and review fields.

## Use cases

```mermaid
flowchart LR
  Donor[Donor] --> Donate[Submit medicine donation]
  Donor --> Rewards[View or redeem own rewards]
  Pharmacy[Pharmacy] --> Inventory[Submit and view own stock]
  NGO[NGO] --> Requests[Submit and manage own requests]
  Hospital[Local Hospital] --> Requests
  NGO --> Browse[Browse available medicines]
  Hospital --> Browse
  Admin[Admin] --> Review[Review donations and requests]
  Admin --> Manage[Manage users, rewards, reports, and statistics]
  Donate --> Admin
  Requests --> Inventory
```

## Donation and request flow

```mermaid
flowchart TD
  Start[Authenticated user] --> Role{Role allowed?}
  Role -->|No| Deny[401 or 403]
  Role -->|Yes| Validate[Validate input, IDs, dates, and quantities]
  Validate -->|Invalid| Reject[400 response]
  Validate -->|Valid| Save[Persist allowed fields]
  Save --> Review{Donation review}
  Review -->|Admin approves| Tx[Transaction: verify donation and award once]
  Tx --> Browse[Available inventory]
  Browse --> Accept[Accept matching request]
  Accept --> Tx2[Transaction: reserve quantity and update request]
```
