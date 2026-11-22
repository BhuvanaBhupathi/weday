export interface ExtractedPRDFacts {
  actors: string[];
  pages: Array<{ id: string; name: string; description: string }>;
  features: Array<{
    id: string;
    name: string;
    description: string;
    pageNames?: string[];
    requirementIds?: string[]; // FR-xxx identifiers this feature implements (LLM-mapped when available)
  }>;
  requirements: Array<{ identifier: string; title: string; description: string }>;
  flows: Array<{
    id: string;
    name: string;
    featureId?: string;
    steps: Array<{
      actor: string;
      pageOrInterface: string;
      action: string;
      apiOrValidation?: string;
      businessLogic?: string;
      persistence?: string;
      externalBoundary?: string;
      response?: string;
    }>;
  }>;
  dataEntities: Array<{
    name: string;
    attributes: string[];
    persisted: boolean;
    featureIds?: string[]; // FEAT-xxx identifiers that own this entity
  }>;
  externalSystems: Array<{ name: string; role: string; explicit: boolean; specifiedProvider?: string }>;
  capabilities: {
    hasAuthentication: boolean;
    authProviderSpecified?: string;
    hasDatabasePersistence: boolean;
    hasFileStorage: boolean;
    fileStorageReason?: string;
    hasEmailDelivery: boolean;
    hasPayments: boolean;
    paymentProviderSpecified?: string;
    hasRealtimeCollaboration: boolean;
    realtimeReason?: string;
    hasAsyncBackgroundProcessing: boolean;
    asyncReason?: string;
    hasCachingRequirement: boolean;
    cachingReason?: string;
    hasSearch?: boolean;
    searchReason?: string;
  };
  explicitTechnologies: string[]; // Technologies the PRD names explicitly
  assumptions: string[];
  decisions: Array<{ identifier: string; decision: string; rationale: string }>;
}

export class PrdInterpreter {
  /**
   * Deterministically parses PRD markdown and requirements into factual product representation.
   */
  static interpret(
    prdContent: string,
    existingRequirements: Array<{ identifier: string; title: string; description: string }> = [],
  ): ExtractedPRDFacts {
    const text = prdContent || '';
    const lower = text.toLowerCase();

    // 1. Identify Actors
    const actors: string[] = [];
    if (/admin|creator|organizer/i.test(text)) actors.push('Admin');
    if (/user|member|collaborator|developer|designer/i.test(text)) actors.push('User');
    if (/visitor|guest|public|client/i.test(text) || actors.length === 0) actors.push('Visitor');

    // 2. Identify Pages
    const pages: Array<{ id: string; name: string; description: string }> = [];
    const pagePatterns = [
      { name: 'Home', rx: /\b(home|landing|index)\b/i, desc: 'Entry screen and hero presentation' },
      { name: 'About', rx: /\babout\b/i, desc: 'Background and contextual narrative' },
      { name: 'Projects', rx: /\b(projects|portfolio|showcase|works)\b/i, desc: 'List and portfolio view' },
      { name: 'Contact', rx: /\b(contact|reach out|get in touch)\b/i, desc: 'Direct inquiry and message submission' },
      { name: 'Dashboard', rx: /\bdashboard\b/i, desc: 'User operational workspace overview' },
      { name: 'Settings', rx: /\bsettings|preferences\b/i, desc: 'Workspace and account controls' },
      { name: 'Editor', rx: /\beditor\b|\bcanvas\b/i, desc: 'Interactive editing workspace' },
      { name: 'Login', rx: /\blogin|sign\s?in|auth\b/i, desc: 'User authentication gateway' },
    ];

    for (const p of pagePatterns) {
      if (p.rx.test(text)) {
        pages.push({ id: `PAGE-${p.name.toUpperCase()}`, name: p.name, description: p.desc });
      }
    }

    if (pages.length === 0) {
      pages.push({ id: 'PAGE-HOME', name: 'Main Application Screen', description: 'Primary interactive client interface' });
    }

    // 3. Extract Features
    const features: Array<{ id: string; name: string; description: string }> = [];
    let featIndex = 1;

    if (/contact form|inquiry|send email/i.test(text)) {
      features.push({
        id: `FEAT-00${featIndex++}`,
        name: 'Contact Inquiry Form',
        description: 'Allows visitors to submit messages delivered directly to the project owner',
      });
    }

    if (/auth|account|login|signup|password/i.test(text)) {
      features.push({
        id: `FEAT-00${featIndex++}`,
        name: 'User Authentication',
        description: 'Enables users to establish identities and access private workspace data',
      });
    }

    if (/project|create project|manage projects/i.test(text)) {
      features.push({
        id: `FEAT-00${featIndex++}`,
        name: 'Project Workspace Management',
        description: 'Create, configure, and maintain project plans and specifications',
      });
    }

    if (/realtime|real-time|collaborat|together|concurrent|presence/i.test(text)) {
      features.push({
        id: `FEAT-00${featIndex++}`,
        name: 'Real-time Live Collaboration',
        description: 'Enables multiple users to interact and observe live changes concurrently',
      });
    }

    if (/payment|stripe|subscription|checkout|billing/i.test(text)) {
      features.push({
        id: `FEAT-00${featIndex++}`,
        name: 'Payment & Billing Processing',
        description: 'Processes financial transactions and manages subscription statuses',
      });
    }

    if (features.length === 0) {
      features.push({
        id: 'FEAT-001',
        name: 'Core Application Workflow',
        description: 'Execute fundamental business functions and display interactive results',
      });
    }

    // 4. Requirements Extraction
    const requirements = [...existingRequirements];
    if (requirements.length === 0) {
      // Parse markdown headers or bullet points
      const reqLines = text.split('\n').filter((l) => /FR-\d+|Requirement\s*\d+|Phase\s*\d+/i.test(l));
      if (reqLines.length > 0) {
        reqLines.slice(0, 8).forEach((line, i) => {
          requirements.push({
            identifier: `FR-00${i + 1}`,
            title: line.replace(/^[^a-zA-Z0-9]+/, '').trim().substring(0, 60),
            description: line.trim(),
          });
        });
      } else {
        requirements.push(
          { identifier: 'FR-001', title: 'Client User Interface', description: 'Deliver responsive navigation and screens' },
          { identifier: 'FR-002', title: 'Application Processing API', description: 'Execute business validations and endpoints' },
          { identifier: 'FR-003', title: 'Data Persistence', description: 'Persist application records and system states' },
        );
      }
    }

    // 5. Detect External Capabilities & Providers
    const hasEmailDelivery = /email|contact form|sendgrid|resend|mailer|smtp|notification mail/i.test(lower);
    const hasAuthentication = /auth|sign in|login|user accounts|authenticated|credential/i.test(lower);
    let authProviderSpecified: string | undefined;
    if (/auth0/i.test(lower)) authProviderSpecified = 'Auth0';
    else if (/clerk/i.test(lower)) authProviderSpecified = 'Clerk';
    else if (/google oauth|google login/i.test(lower)) authProviderSpecified = 'Google OAuth';
    else if (/firebase auth/i.test(lower)) authProviderSpecified = 'Firebase Auth';
    else if (/github oauth/i.test(lower)) authProviderSpecified = 'GitHub OAuth';

    const hasPayments = /payment|stripe|paypal|lemon\s?squeezy|paddle|checkout|subscription/i.test(lower);
    let paymentProviderSpecified: string | undefined;
    if (/stripe/i.test(lower)) paymentProviderSpecified = 'Stripe';
    else if (/paypal/i.test(lower)) paymentProviderSpecified = 'PayPal';
    else if (/lemon\s?squeezy/i.test(lower)) paymentProviderSpecified = 'Lemon Squeezy';

    const hasRealtimeCollaboration =
      /realtime|real-time|see edits immediately|multiplayer|simultaneous|live cursor|presence/i.test(lower);
    const realtimeReason = hasRealtimeCollaboration
      ? 'Multiple users must observe shared changes and presence simultaneously'
      : undefined;

    // Negation guard: "No need for background workers" must NOT trigger async.
    const asyncNegated = /no need for[^.\n]{0,40}(background|queue|worker)|without (background|queue|worker)|no (background|queue|worker)s?\b/i.test(
      lower,
    );
    const hasAsyncBackgroundProcessing =
      /queue|background worker|video transcod|heavy export|batch process|cron job/i.test(lower) &&
      !/simple|portfolio|landing/i.test(lower) &&
      !asyncNegated;

    // Strict caching check: Only if explicit high-read pattern or latency requirement stated
    const hasCachingRequirement =
      /sub-millisecond|extreme read throughput|redis caching required|high traffic cache/i.test(lower) &&
      !/simple|portfolio|landing page|mvp/i.test(lower);

    const hasFileStorage = /upload|s3|blob|image store|avatar upload|pdf download/i.test(lower);
    const hasDatabasePersistence =
      /database|db|postgres|relational|persistent records|store project|user records/i.test(lower) ||
      requirements.length > 1;

    // 6. User Flows Reconstruction
    const flows: ExtractedPRDFacts['flows'] = [];
    if (hasEmailDelivery) {
      flows.push({
        id: 'FLOW-CONTACT',
        name: 'Contact Inquiry Delivery',
        featureId: features.find((f) => f.name.includes('Contact'))?.id,
        steps: [
          {
            actor: 'Visitor',
            pageOrInterface: 'Contact Page',
            action: 'Submits Contact Message',
            apiOrValidation: 'POST /api/contact (Payload Validation)',
            businessLogic: 'Format owner notification template',
            externalBoundary: 'Deliver message via Email Service Provider',
            response: 'Return submission confirmation badge',
          },
        ],
      });
    }

    if (hasAuthentication) {
      flows.push({
        id: 'FLOW-AUTH',
        name: 'User Sign In & Session Verification',
        featureId: features.find((f) => f.name.includes('Authentication'))?.id,
        steps: [
          {
            actor: 'User',
            pageOrInterface: 'Login Page',
            action: 'Submits Credentials / Identity Token',
            apiOrValidation: 'POST /api/auth/login',
            businessLogic: 'Verify identity & generate session signature',
            persistence: 'Query/update user credentials in Database',
            response: 'Redirect to user workspace dashboard',
          },
        ],
      });
    }

    if (hasPayments) {
      flows.push({
        id: 'FLOW-PAYMENT',
        name: 'Checkout & Subscription Activation',
        featureId: features.find((f) => f.name.includes('Payment'))?.id,
        steps: [
          {
            actor: 'User',
            pageOrInterface: 'Pricing / Checkout Page',
            action: 'Initiates plan purchase',
            apiOrValidation: 'POST /api/checkout/session',
            businessLogic: 'Construct checkout session',
            externalBoundary: paymentProviderSpecified ? `${paymentProviderSpecified} API` : 'External Payment Provider',
            persistence: 'Save pending order record in Database',
            response: 'Redirect to secure checkout modal',
          },
        ],
      });
    }

    // Default primary flow if no specific flow was matched
    if (flows.length === 0) {
      flows.push({
        id: 'FLOW-CORE',
        name: 'Primary Application Usage',
        steps: [
          {
            actor: actors[0] || 'User',
            pageOrInterface: pages[0]?.name || 'Home Screen',
            action: 'Interact with primary application feature',
            apiOrValidation: 'POST /api/resource (Validate input)',
            businessLogic: 'Execute domain logic',
            persistence: hasDatabasePersistence ? 'Persist state in Relational DB' : undefined,
            response: 'Render updated state and visual confirmation',
          },
        ],
      });
    }

    // 7. Data Entities
    const dataEntities: ExtractedPRDFacts['dataEntities'] = [];
    if (hasAuthentication) {
      dataEntities.push({ name: 'User', attributes: ['id', 'email', 'name', 'role', 'createdAt'], persisted: true });
      dataEntities.push({ name: 'Session', attributes: ['id', 'userId', 'token', 'expiresAt'], persisted: true });
    }
    if (/project/i.test(lower)) {
      dataEntities.push({ name: 'Project', attributes: ['id', 'title', 'ownerId', 'status', 'createdAt'], persisted: true });
    }
    if (hasEmailDelivery && /contact form|inquiry|contact page/i.test(lower)) {
      dataEntities.push({ name: 'Inquiry', attributes: ['id', 'name', 'email', 'message', 'createdAt'], persisted: hasDatabasePersistence });
    }
    if (hasPayments) {
      dataEntities.push({ name: 'Subscription', attributes: ['id', 'userId', 'plan', 'status', 'periodEnd'], persisted: true });
    }
    if (dataEntities.length === 0) {
      dataEntities.push({ name: 'AppRecord', attributes: ['id', 'title', 'payload', 'createdAt'], persisted: hasDatabasePersistence });
    }

    // 8. External Systems
    const externalSystems: ExtractedPRDFacts['externalSystems'] = [];
    if (hasEmailDelivery) {
      externalSystems.push({
        name: 'Email Provider',
        role: 'Transactional mail transport to recipient',
        explicit: true,
        specifiedProvider: /resend/i.test(lower) ? 'Resend' : /sendgrid/i.test(lower) ? 'SendGrid' : undefined,
      });
    }
    if (hasAuthentication && authProviderSpecified) {
      externalSystems.push({
        name: authProviderSpecified,
        role: 'Federated Identity Provider',
        explicit: true,
        specifiedProvider: authProviderSpecified,
      });
    }
    if (hasPayments) {
      externalSystems.push({
        name: paymentProviderSpecified || 'Payment Provider',
        role: 'Payment processing and webhook provider',
        explicit: true,
        specifiedProvider: paymentProviderSpecified,
      });
    }

    // 9a. Explicit technologies named in the PRD
    const explicitTechPatterns: Array<[RegExp, string]> = [
      [/\bnext\.?js\b/i, 'Next.js'],
      [/\breact\b/i, 'React'],
      [/\bnest\s?js\b/i, 'NestJS'],
      [/\bexpress\b/i, 'Express'],
      [/\bnode\.?js\b/i, 'Node.js'],
      [/\bpostgres(?:ql)?\b/i, 'PostgreSQL'],
      [/\bsqlite\b/i, 'SQLite'],
      [/\bmysql\b/i, 'MySQL'],
      [/\bmongo(?:db)?\b/i, 'MongoDB'],
      [/\bredis\b/i, 'Redis'],
      [/\bstripe\b/i, 'Stripe'],
      [/\bsendgrid\b/i, 'SendGrid'],
      [/\bresend\b/i, 'Resend'],
      [/\bauth0\b/i, 'Auth0'],
      [/\bclerk\b/i, 'Clerk'],
      [/\baws\b/i, 'AWS'],
      [/\bgraphql\b/i, 'GraphQL'],
      [/\bsocket\.?io\b/i, 'Socket.IO'],
      [/\bliveblocks\b/i, 'Liveblocks'],
    ];
    const explicitTechnologies = explicitTechPatterns
      .filter(([rx]) => rx.test(text))
      .map(([, name]) => name);

    // 9. Assumptions & Decisions
    const assumptions: string[] = [];
    assumptions.push('Single modular monolith deployment satisfies initial MVP operational requirements.');
    if (hasAuthentication && !authProviderSpecified) {
      assumptions.push('Identity provider selection is deferred as an open decision (status: UNRESOLVED).');
    }
    if (!hasCachingRequirement) {
      assumptions.push('In-memory or standard database index performance is sufficient without distributed caching (Redis).');
    }

    return {
      actors,
      pages,
      features,
      requirements,
      flows,
      dataEntities,
      externalSystems,
      capabilities: {
        hasAuthentication,
        authProviderSpecified,
        hasDatabasePersistence,
        hasFileStorage,
        fileStorageReason: hasFileStorage ? 'PRD requires file/upload handling' : undefined,
        hasEmailDelivery,
        hasPayments,
        paymentProviderSpecified,
        hasRealtimeCollaboration,
        realtimeReason,
        hasAsyncBackgroundProcessing,
        asyncReason: hasAsyncBackgroundProcessing ? 'Heavy asynchronous processing pipeline' : undefined,
        hasCachingRequirement,
        cachingReason: hasCachingRequirement ? 'Explicit high-throughput requirement' : undefined,
        hasSearch: /full.?text search|search across|global search|search feature/i.test(lower),
        searchReason: /full.?text search|search across|global search|search feature/i.test(lower)
          ? 'PRD requires search across content'
          : undefined,
      },
      explicitTechnologies,
      assumptions,
      decisions: [
        {
          identifier: 'DEC-001',
          decision: 'Standard 2/3-tier architecture with modular boundary isolation',
          rationale: 'Avoid premature microservices and distributed complexity for MVP',
        },
      ],
    };
  }
}
