# 🖥️ Study-Sphere - Server Side (Backend)

This is the **backend** codebase for [🎓 Study-Sphere](https://study-sphere-fb1d4.web.app), a collaborative study platform for students, tutors, and admins. The backend provides RESTful APIs, JWT-based authentication, role-based access control, CRUD functionality, and payment integration.

📁 **Server Domain**: [Server Domain](https://studys-phere-server.vercel.app)  
📁 **Server Repo**: [Server GitHub](https://github.com/Programming-Hero-Web-Course4/b11a12-server-side-jamilWebdesign2024)

---

## 🚀 Technologies & Packages

| Package           | Purpose                                         |
|-------------------|-------------------------------------------------|
| **express**       | Web server framework                            |
| **mongodb**       | MongoDB native driver for database operations   |
| **cors**          | Enable Cross-Origin Resource Sharing            |
| **dotenv**        | Secure environment variable management          |
| **jsonwebtoken**  | JWT token creation and verification              |
| **cookie-parser** | Parse cookies for secure auth management        |
| **stripe**        | Handle payment integration                      |

---

## 📦 Installation & Setup

### ✅ Prerequisites

- Node.js and npm installed
- MongoDB connection URI
- Firebase project (for token validation from client)
- Stripe Secret Key

### ⚙️ Steps

```bash
# 1. Clone the repository
git clone https://github.com/Programming-Hero-Web-Course4/b11a12-server-side-jamilWebdesign2024.git

# 2. Go into the project folder
cd b11a12-server-side-jamilWebdesign2024

# 3. Install dependencies
npm install

# 4. Create a .env file and add your credentials
