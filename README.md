Please follow below steps to setup the project and get started:

- clone to local
- run `yarn install`
- create `.env` file and copy contents from `.env.example`
- keep all values as same as `.env.example` except `GEMINI_API_KEY`
- login to https://aistudio.google.com/welcome and create your API_KEY
- add that API key as value to `GEMINI_API_KEY`
- run `yarn start:cli analyze --path <absolute path of codebase>` (currently it only supports javascript and python codebase)

Documentation:

Simple Traycer
Simple Traycer as the name suggests it is the simple version of Traycer.io visioned from usage and reverse engineering. Here the goal is to create a minimal version of Traycer in Node.js & Typescript

Background (understanding from product usage): Traycer works on the application layer, on top of LLM(s). It takes the context of the current codebase and takes the task/feature to be implemented by the user. Just like how humans work,
it will try to analyse the entire codebase (or only specific context) to better understand how things are built.
It layouts step by step plan to achieve the goal, like dividing the task into smaller one, identifying the files to be modified along with the changes etc
Once plan is laid out user can approve it or add enhancements to it, once approved it will let the user choose the model of his choice to write the code
Once code changes are made, it will review the changes w.r.t to the plan. If it differs it re-iterates to bring down the delta.
Once done, it will trigger the submission where it will commit and raise PR.

What Simple Traycer will do:
It will be a minimal version of Traycer backend
For now it will only support JS/TS
It will be implemented as a webapp(fastest way to make the product live in given time constraint), may be certain functions like current dir file changes, committing to github will be limited
It will be able to understand the context and the feature goal, layout plan, execute it and review it and re-iterate to minimize the diff and return.

Tech stack chosen:
Backend framework: Nestjs, it is chosen because of its Typescript first approach, and modular way to build scalable backend services. It provides out of the box architectures like dependency injection, integration with external tools (ORM, Message queues) and supports microservices.
Message Queue (RabbitMQ):At scale we need to implement message queues and also divide the monolith into microservices, but for now I'm implementing without a queue and it will be a monolith.
Network Protocol (HTTPS): to have a seamless user experience it will be best to implement websockets, for now I’ll handle all communication via HTTPS.
Database: Will use following types of databases here
SQL (Postgres): to store user info, user metadata, billing, usage etc.
No-SQL (MongoDB): to store chat history and interaction with LLM data.
Vector DB (): to store the context of the codebase.
Elasticsearch/HDFS (): to store logs

Currently the application is built as a monolith, but the below explained services can be implemented as separate microservices.

This doc will provide info on all the services and the API exposed.

Context Service:
Responsible for reading the current workspace files and building the context out of it using LLM and also storing it in the vector database
It will have the capability to choose the desired LLM for context building

Planning Service:
Responsible for taking user input for features and layout the path of implementation using context service.
It will have the capability to choose the desired LLM

Execution Service:
Responsible for making the code changes in the given context as per the planning steps
It will have the capability to choose the desired LLM

Review Service:
Responsible for comparing the context after changes and compare it against the plan, if difference then re-iterate execution

Submission Service:
Responsible to perform housekeeping tasks like linting, commenting, creating branch, committing code and push to github

User Service:
Responsible for user create and other metadata like credits, usage, billing etc

Workflow Service:
Responsible for orchestrating the pipeline of context-plan-execute-review-submission as per user config.
