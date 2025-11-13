# Assessly: A Remotely Proctored Online Assessment Platform

Assessly is a comprehensive and robust online assessment platform designed to conduct secure and fair examinations. It features a sophisticated remote proctoring system that monitors candidates' behavior during the test, ensuring academic integrity. The application is built with a modern microservices architecture and is containerized using Docker for seamless deployment and scalability.

## 📝 Table of Contents

- [About The Project](#about-the-project)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Configuration](#configuration)
- [Usage](#usage)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)

## 🧐 About The Project

Assessly is a web-based application designed to facilitate online assessments and examinations. It provides a secure and controlled environment for conducting tests, with a focus on preventing cheating and ensuring the integrity of the results. The platform is divided into three main components: a client (frontend), a server (backend), and a proctoring service.

## ✨ Key Features

- **User-Friendly Interface**: A clean and intuitive interface for both test-takers and administrators.
- **Secure Authentication**: A robust authentication system to ensure that only authorized users can access the platform.
- **Remote Proctoring**: An AI-powered proctoring module that monitors candidates for suspicious activities during the exam.
- **Real-Time Monitoring**: The proctoring service provides real-time alerts and insights to the exam administrators.
- **Scalable Architecture**: The microservices-based architecture allows for easy scaling and maintenance of the application.
- **Containerized Deployment**: The use of Docker and Docker Compose simplifies the deployment and setup process.

## 💻 Tech Stack

| Component | Technology | Description |
|-----------|------------|-------------|
| Frontend (Client) | JavaScript | The user interface of the application. |
| Backend (Server) | Node.js | The core business logic and API of the application. |
| Proctoring Service | Python | The AI-powered proctoring module. |
| Containerization | Docker | For creating and managing containers. |
| Orchestration | Docker Compose | For defining and running multi-container Docker applications. |

## 📁 Project Structure

The project is organized into three main directories, each representing a microservice:

- **`client/`**: Contains the frontend application code.
- **`server/`**: Contains the backend application code.
- **`proctor/`**: Contains the proctoring service code.

The `docker-compose.yml` file at the root of the project defines the services and their configurations.

## 🚀 Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

Make sure you have the following software installed on your machine:

- [Docker](https://www.docker.com/)
- [Docker Compose](https://docs.docker.com/compose/)

### Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/Parthiban1805/assessly_final.git
   ```

2. **Navigate to the project directory:**

   ```bash
   cd assessly_final
   ```

3. **Run with Docker Compose:**

   ```bash
   docker-compose up --build
   ```

   This command will build the Docker images for the client, server, and proctor services and run them in containers.

### Configuration

The `docker-compose.yml` file contains the configuration for the services. You can modify this file to change the port mappings, environment variables, and other settings.

## 🔧 Usage

Once the application is running, you can access the client service in your web browser. The default URL is typically `http://localhost:3000`, but this may vary depending on the configuration in the `docker-compose.yml` file.

The server will be running on a different port and will handle API requests from the client. The proctoring service will also be running and will be utilized during assessments to monitor the candidates.

## 🤝 Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

If you have a suggestion that would make this better, please fork the repo and create a pull request. You can also simply open an issue with the tag "enhancement".

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📜 License

This project is not licensed. It is recommended to add a license to the project to define the terms under which it can be used, modified, and distributed.

## 📧 Contact

- **Parthiban** - [Parthiban1805](https://github.com/Parthiban1805)
- **ASWIN V K** - [aswin09032006](https://github.com/aswin09032006)

---

⭐ **Star this repository if you find it helpful!**
