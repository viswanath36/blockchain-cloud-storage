# System Architecture

## 🔷 Architecture Flow

User → Frontend UI → Backend Server → Encryption Layer → IPFS Storage → Blockchain Network

---

## 🧠 Components

### Frontend
User interacts with forms to upload and download files.

### Backend
Handles authentication, encryption, IPFS upload, blockchain communication.

### Encryption Layer
Files encrypted using AES-256 before storage.

### IPFS
Stores encrypted files in distributed storage.

### Blockchain
Stores IPFS hash permanently using smart contract.

---

## 🔒 Data Flow
1. User uploads file  
2. File encrypted  
3. Encrypted file → IPFS  
4. Hash stored on Ethereum  
5. Hash verified during download