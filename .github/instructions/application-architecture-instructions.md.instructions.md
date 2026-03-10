---
applyTo: '**'
---
Provide project context and coding guidelines that AI should follow when generating code, answering questions, or reviewing changes.

Application Architecture and Engineering Requirements
Purpose

These applications are primarily for internal and personal use, but they must still be built with strong engineering discipline. The goal is to produce software that is reliable, testable, resilient, and not dependent on the uptime, behavior, or performance of third-party systems at runtime.

The system must be designed so that application behavior is driven by controlled internal data, with all business logic implemented in testable service layers and validated through a requirements-first testing approach.

Core Architectural Principles
1. No Real-Time Runtime Dependencies on External Systems

The application must not depend on third-party systems during normal runtime operation.

Requirements

The application must operate entirely from internally controlled data sources.

No runtime feature, page, workflow, or user interaction may require a live third-party API call in order to function.

External systems may be used only through separate ingestion, scraping, synchronization, import, or integration processes.

Any required third-party data must be copied into an internal datastore before the application uses it.

Application availability and resiliency must not depend on external vendors, APIs, websites, or services.

Implications

External integration is a background acquisition concern, not an application runtime concern.

The application must treat external systems as sources to ingest from, not systems to query live.

Failures in external acquisition pipelines must not bring down the application itself. They may degrade freshness of data, but not core availability.

2. Internal Data Ownership

The application must run against its own dataset.

Requirements

The system must maintain its own internal database or equivalent persistent data store.

All runtime reads must come from internal storage.

All runtime business rules must operate only on internal representations of the data.

Data models should be normalized and designed for internal use rather than mirroring third-party schemas unnecessarily.

External source schemas should be translated into internal canonical models during ingestion.

Implications

The system owns its own truth for runtime purposes.

External data mapping and transformation belong in the ingestion pipeline, not in the UI and not in the core runtime business logic unless explicitly necessary.

3. Thin UI / Dumb UI

The user interface layer must be thin and presentation-focused.

Requirements

The UI layer must contain no business logic.

The UI must not be responsible for decision-making, rules evaluation, data validation rules beyond basic input formatting, or workflow orchestration.

The UI should primarily:

collect user input,

render data,

call service/API endpoints,

display results, errors, and state.

Forbidden in UI

Conditional business rules

Data transformation tied to domain rules

Authorization logic beyond display concerns

Cross-entity workflow decision-making

Error recovery policies

Retry strategies

Rule interpretation

Implications

The UI is replaceable.

The core application behavior must remain consistent regardless of presentation layer.

Logic must be centralized elsewhere so it can be tested directly.

4. Business Logic Must Live in a Service/API Layer

All application intelligence must live in a service layer or API layer that can be exercised directly through requests and responses.

Requirements

Every meaningful rule, decision, calculation, validation, state transition, and workflow branch must be implemented in a testable service/API layer.

The service layer must expose behavior in a form that can be validated without a UI.

Services must be designed for deterministic testing.

Services must depend on abstractions/interfaces rather than concrete external implementations where possible.

Design Goals

Easy to unit test

Easy to mock

Clear contract boundaries

Stable behavior independent of UI framework

Reusable across multiple presentation layers if needed

Testing Philosophy
5. Requirements-First Verification

Testing is not an afterthought and not merely a technical step. The real question is: how do we know the system does what it is supposed to do?

Requirements

For each requirement, expected behavior must be defined before implementation is considered complete.

The team must define what success looks like before building the logic.

The test suite must represent required system behavior, not merely code coverage targets.

Tests must cover:

intended success cases,

edge cases,

invalid inputs,

expected failures,

recovery behavior,

resilience behavior,

state consistency after errors.

Principle

Do not start with “How do we test this?”
Start with “What must this do, and how will we know it did it correctly?”

6. Test Layer and Mock Data Must Be Built First

The preferred implementation approach is to design the test layer and mock data before implementing the service logic.

Requirements

Before implementing business logic, define:

the expected behaviors,

the service contracts,

the input/output expectations,

the error scenarios,

the recovery expectations.

Build mock data sources and test fixtures first.

Use those mocks to define and validate the target behavior of the service layer.

Initial service implementations may be stubbed and return failure/default responses until logic is added.

The first milestone is not working production logic. The first milestone is a complete and meaningful verification target.

Rationale

If the team cannot simulate the scenarios it cares about, then the design is not yet understood well enough.

7. Unit Testing Is the Main Quality Mechanism

The service layer must be heavily unit tested using mock data sources.

Requirements

Unit tests must be the primary mechanism for validating business logic.

Tests must isolate the service layer from real infrastructure wherever possible.

Mock or fake repositories, providers, and dependencies must be used to simulate:

normal conditions,

boundary conditions,

corrupt or incomplete data,

dependency failures,

timeout or unavailable conditions where applicable,

duplicate or conflicting data cases.

Expectations

Tests should be easy to read and clearly map back to requirements.

A reader should be able to infer intended system behavior from the test suite.

Unit tests must be comprehensive enough to give confidence in logic correctness without requiring UI-based testing.

Error Handling and Resilience Requirements
8. Error Scenarios Must Be Explicitly Defined

For each significant feature or workflow, the system must define not only the happy path but also the failure paths.

Requirements

Each major requirement must answer:

How does the feature work when everything is valid?

How does it behave when input is missing, malformed, conflicting, or incomplete?

What happens when internal dependencies fail?

What happens when expected data is absent?

What happens when operations partially succeed?

What recovery behavior is expected?

What should be logged?

What should be surfaced to the caller or UI?

What should fail fast versus recover gracefully?

Implementation Requirement

No service is complete until its error behavior is intentionally designed and test-covered.

9. Recovery Behavior Must Be Testable

Recovery is part of the requirement, not an optional enhancement.

Requirements

Where recovery behavior is expected, it must be explicitly defined.

Recovery strategies must be implemented in the service layer, not improvised in the UI.

Recovery expectations must be testable through automated tests.

The system must preserve data consistency after failed operations.

Partial failure behavior must be documented and verified.

Development Workflow Requirements
10. Recommended Development Sequence

Development should follow this order:

Step 1: Define requirements

What must the system do?

What inputs, outputs, rules, and failure cases exist?

Step 2: Define test cases

What evidence proves each requirement is met?

What scenarios must pass?

What scenarios must fail safely?

Step 3: Build mock data and fake dependencies

Create representative and edge-case datasets.

Create mock repositories/providers/interfaces.

Step 4: Create service contracts and stubs

Define interfaces and method signatures.

Stub implementations may return default failure values initially.

Step 5: Write the unit tests

Write tests against the intended service behavior.

Confirm that unimplemented services fail those tests initially.

Step 6: Implement business logic

Implement only enough logic to satisfy the tests.

Refine behavior until the service meets the requirement set.

Step 7: Keep UI thin

After service behavior is proven, wire up the UI as a consumer of the service/API layer.

Layer Responsibilities
11. Data Ingestion Layer

Responsible for:

pulling data from third-party systems,

scraping/importing/syncing,

mapping external schemas to internal models,

storing results in internal data stores,

handling freshness and synchronization concerns.

Not responsible for:

UI rendering,

runtime business workflows,

user interaction handling.

12. Data Access Layer

Responsible for:

reading and writing internal data,

encapsulating persistence operations,

exposing abstractions that can be mocked in tests.

Not responsible for:

business decisions,

UI logic,

third-party runtime dependencies.

13. Service/API Layer

Responsible for:

all business logic,

validation,

calculations,

workflow orchestration,

error handling and recovery logic,

returning predictable results to callers.

This is the primary layer for testing.

14. UI Layer

Responsible for:

rendering views,

collecting input,

invoking service/API operations,

displaying output and user-facing errors.

Not responsible for:

business logic,

decision-making,

recovery strategies,

direct third-party integration.

Quality Standards
15. Testability Is a First-Class Requirement

All major design decisions should favor testability.

Requirements

Dependencies must be injectable.

Interfaces should be used where mocking is beneficial.

Services should avoid hidden side effects.

Business logic should be deterministic whenever possible.

Methods should have clear inputs and outputs.

Large, mixed-responsibility methods should be avoided.

16. Requirements Must Be Traceable to Tests

Each meaningful requirement should map to one or more automated tests.

Goal

A reviewer should be able to look at a requirement and identify:

where it is implemented,

how it is verified,

what test proves it works,

what test proves it fails correctly.

17. Passing Tests Define Implementation Readiness

A feature is not considered complete because code exists. It is complete when:

the requirement is clearly defined,

the expected behavior is covered by tests,

the implementation passes those tests,

error and recovery behavior are also covered.

Non-Negotiable Rules

No real-time runtime dependence on third-party systems.

Runtime data comes from internal storage only.

UI must be thin and contain no business logic.

All business logic belongs in a service/API layer.

The service/API layer must be extensively unit tested.

Mock data and tests should be built before full logic implementation.

Requirements must include success cases, failure cases, and recovery expectations.

The system is only considered correct when behavior is proven through automated tests.

Implementation Directive for Agentic AI

When proposing or generating implementation work, follow these rules:

Do not place business logic in the UI.

Do not introduce runtime third-party dependencies.

Prefer internal canonical data models.

Start by defining behavior, contracts, and tests.

Build mocks/fakes before real implementations where practical.

Write tests for happy path, edge cases, failures, and recovery.

Keep services deterministic and injectable.

Treat testability, resilience, and internal data ownership as top-priority architectural constraints.