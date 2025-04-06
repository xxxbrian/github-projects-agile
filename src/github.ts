import { QUERY } from './get-project-items';

const GITHUB_API = 'https://api.github.com/graphql';

// --- Base & Utility Types ---

export interface PageInfo {
  endCursor: string | null;
  hasNextPage: boolean;
}

export interface ActorNode {
  login: string;
  id?: string; // Added optional ID as it's often useful
}

export interface UserConnection {
  nodes: ActorNode[];
  // Add totalCount, pageInfo if needed/queried
}

export interface LabelNode {
  name: string;
  color: string;
  id: string;
}

export interface LabelConnection {
  nodes: LabelNode[];
  // Add totalCount, pageInfo if needed/queried
}

export interface MilestoneNode {
  title: string;
  number: number;
  state: "OPEN" | "CLOSED";
  id: string;
}

export interface RepositoryNode {
  name: string;
  nameWithOwner: string;
  id: string;
}

// --- ProjectV2 Field Value Types ---

export interface ProjectV2FieldCommonNode {
  name: string;
}

export interface ProjectV2ItemFieldTextValueNode {
  __typename: "ProjectV2ItemFieldTextValue";
  field: ProjectV2FieldCommonNode;
  text: string | null;
}

export interface ProjectV2ItemFieldNumberValueNode {
  __typename: "ProjectV2ItemFieldNumberValue";
  field: ProjectV2FieldCommonNode;
  number: number | null;
}

export interface ProjectV2ItemFieldDateValueNode {
  __typename: "ProjectV2ItemFieldDateValue";
  field: ProjectV2FieldCommonNode;
  date: string | null; // Representing Date as string from JSON
}

export interface ProjectV2ItemFieldSingleSelectValueNode {
   __typename: "ProjectV2ItemFieldSingleSelectValue";
   field: ProjectV2FieldCommonNode;
   name: string | null;
   optionId: string | null;
}

export interface ProjectV2ItemFieldIterationValueNode {
  __typename: "ProjectV2ItemFieldIterationValue";
  field: ProjectV2FieldCommonNode;
  title: string;
  iterationId: string;
  startDate: string; // Representing Date as string
  duration: number;
}

export interface ProjectV2ItemFieldUserValueNode {
  __typename: "ProjectV2ItemFieldUserValue";
  field: ProjectV2FieldCommonNode;
  users: UserConnection;
}

export interface ProjectV2ItemFieldLabelValueNode {
  __typename: "ProjectV2ItemFieldLabelValue";
  field: ProjectV2FieldCommonNode;
  labels: LabelConnection;
}

export interface ProjectV2ItemFieldMilestoneValueNode {
    __typename: "ProjectV2ItemFieldMilestoneValue";
    field: ProjectV2FieldCommonNode;
    milestone: MilestoneNode | null;
}

export interface ProjectV2ItemFieldRepositoryValueNode {
    __typename: "ProjectV2ItemFieldRepositoryValue";
    field: ProjectV2FieldCommonNode;
    repository: RepositoryNode | null;
}

export interface PullRequestMiniNode {
     number: number;
     title: string;
     url: string;
     id: string;
}
export interface PullRequestConnection {
     nodes: PullRequestMiniNode[];
     // Add totalCount, pageInfo if needed/queried
}
export interface ProjectV2ItemFieldPullRequestValueNode {
    __typename: "ProjectV2ItemFieldPullRequestValue";
    field: ProjectV2FieldCommonNode;
    pullRequests: PullRequestConnection;
}

// Note: The query fetches __typename for reviewers implicitly via the fragment type condition
export interface UserReviewerNode {
  __typename: "User";
  id: string;
  login: string;
}
export interface TeamReviewerNode {
  __typename: "Team";
  id: string;
  name: string;
}
export interface MannequinReviewerNode {
    __typename: "Mannequin";
    id: string;
    login: string;
}
type ReviewerNode = UserReviewerNode | TeamReviewerNode | MannequinReviewerNode;

export interface ReviewerConnection {
  nodes: ReviewerNode[];
   // Add totalCount, pageInfo if needed/queried
}
export interface ProjectV2ItemFieldReviewerValueNode {
    __typename: "ProjectV2ItemFieldReviewerValue";
    field: ProjectV2FieldCommonNode;
    reviewers: ReviewerConnection;
}


// Union of all possible field value types
type ProjectV2ItemFieldValueNode =
  | ProjectV2ItemFieldTextValueNode
  | ProjectV2ItemFieldNumberValueNode
  | ProjectV2ItemFieldDateValueNode
  | ProjectV2ItemFieldSingleSelectValueNode
  | ProjectV2ItemFieldIterationValueNode
  | ProjectV2ItemFieldUserValueNode
  | ProjectV2ItemFieldLabelValueNode
  | ProjectV2ItemFieldMilestoneValueNode
  | ProjectV2ItemFieldRepositoryValueNode
  | ProjectV2ItemFieldPullRequestValueNode
  | ProjectV2ItemFieldReviewerValueNode;

export interface ProjectV2ItemFieldValueConnection {
  pageInfo: PageInfo;
  nodes: ProjectV2ItemFieldValueNode[];
}


// --- ProjectV2 Item Content Types ---

export interface CreatorNode {
    __typename: string; // e.g., "User", "Bot"
    login?: string; // Assuming Actor always has login based on query fragment
}

export interface DraftIssueContent {
  __typename: "DraftIssue";
  id: string;
  title: string;
  body: string;
  assignees: UserConnection;
  creator: CreatorNode | null;
}

export interface IssueContent {
  __typename: "Issue";
  id: string;
  number: number;
  title: string;
  body: string;
  url: string;
  state: "OPEN" | "CLOSED";
  stateReason: "COMPLETED" | "REOPENED" | "NOT_PLANNED" | null;
  createdAt: string; // Representing DateTime as string
  closedAt: string | null; // Representing DateTime as string
  author: ActorNode | null; // User could be deleted
  assignees: UserConnection;
  labels: LabelConnection;
  milestone: MilestoneNode | null;
  repository: RepositoryNode;
}

export interface PullRequestContent {
  __typename: "PullRequest";
  id: string;
  number: number;
  title: string;
  body: string;
  url: string;
  state: "OPEN" | "CLOSED" | "MERGED";
  createdAt: string; // Representing DateTime as string
  closedAt: string | null; // Representing DateTime as string
  mergedAt: string | null; // Representing DateTime as string
  author: ActorNode | null; // User could be deleted
  assignees: UserConnection;
  labels: LabelConnection;
  milestone: MilestoneNode | null;
  repository: RepositoryNode;
  headRefName: string;
  baseRefName: string;
  reviewDecision: "APPROVED" | "CHANGES_REQUESTED" | "REVIEW_REQUIRED" | null;
}

type ProjectV2ItemContent = DraftIssueContent | IssueContent | PullRequestContent;

// --- ProjectV2 Item Node ---

export interface ProjectV2ItemNode {
  id: string;
  createdAt: string; // Representing DateTime as string
  updatedAt: string; // Representing DateTime as string
  isArchived: boolean;
  type: "ISSUE" | "PULL_REQUEST" | "DRAFT_ISSUE";
  fieldValues: ProjectV2ItemFieldValueConnection;
  content: ProjectV2ItemContent | null; // Content might be null if item is inaccessible or deleted?
}

export interface ProjectV2ItemConnection {
  totalCount: number;
  pageInfo: PageInfo;
  nodes: ProjectV2ItemNode[];
}

// --- ProjectV2 Data ---

export interface ProjectV2Data {
  __typename: "ProjectV2"; // Explicitly setting the type
  id: string;
  title: string;
  number: number;
  items: ProjectV2ItemConnection;
}

// --- Final GraphQL Response Structure ---

export interface GetProjectItemsGraphQLResponse {
  data: {
    node: ProjectV2Data | null; // Node could be null if ID is wrong
  };
  // Optional: Include errors if you want to type-check them too
  errors?: Array<{ message: string; locations?: Array<{ line: number; column: number }>; path?: string[] }>;
}


// --- Function Signatures ---
async function graphqlRequest(token: string, query: string, variables: any = {}) {
  const response = await fetch(GITHUB_API, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.statusText}`);
  }

  const data = await response.json();

  if (data.errors) {
    throw new Error(`GraphQL Error: ${JSON.stringify(data.errors)}`);
  }

  return data.data;
}

export async function getProjectItems(token: string, projectId: string): Promise<ProjectV2Data | null> {
  // read the query from the file
  // const query = fs.readFileSync('get-project-items.gql', 'utf-8');
  const variables = {
    projectId,
    itemsCursor: null,
    fieldValuesCursor: null,
  };
  const data = await graphqlRequest(token, QUERY, variables);
  const projectNode = data.node as ProjectV2Data | null;
  // if (projectNode) {
  //   console.log(`Project Title: ${projectNode.title}`);

  //   // NOTE: Need pagination logic here to get all items
  //   const itemsPage = projectNode.items.nodes;

  //   for (const item of itemsPage) {
  //     console.log(`  Item ID: ${item.id}, Type: ${item.type}`);
  //     if (item.content) {
  //       // Access content based on its type
  //       if (item.content.__typename === 'Issue' || item.content.__typename === 'PullRequest' || item.content.__typename === 'DraftIssue') {
  //         console.log(`    Title: ${item.content.title}`);
  //       }
  //     }

  //     // NOTE: Need pagination logic here to get all field values
  //     const fieldValuesPage = item.fieldValues.nodes;
  //     for (const fieldValue of fieldValuesPage) {
  //         console.log(`    Field (${fieldValue.field.name}):`, fieldValue);
  //         // You can switch on fieldValue.__typename to handle specific value types
  //     }
  //   }
  // } else {
  //   console.log("Project not found or not a ProjectV2 type.");
  // }

  return projectNode;
}

