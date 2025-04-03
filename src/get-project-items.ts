export const QUERY = `query GetProjectItems($projectId: ID!, $itemsCursor: String, $fieldValuesCursor: String) {
  # Fetch the node using its global ID (the projectId)
  node(id: $projectId) {
    # Specify that we expect this node to be a ProjectV2
    ... on ProjectV2 {
      id
      title # Project title
      number # Project number
      # Fetch the items (tasks) within this project
      # Use pagination (first: 100) to get up to 100 items per request.
      # You'll need to implement pagination logic in your client
      # to fetch all items if there are more than 100.
      items(first: 100, after: $itemsCursor) {
        totalCount # Total number of items in the project
        pageInfo {
          endCursor
          hasNextPage
        }
        nodes {
          id
          createdAt
          updatedAt
          isArchived
          type # Type of the item (ISSUE, PULL_REQUEST, DRAFT_ISSUE)

          # --- Get Custom Field Values for this item ---
          # Again, use pagination if you have many custom fields or many values (e.g., multiple assignees)
          fieldValues(first: 100, after: $fieldValuesCursor) {
            pageInfo {
              endCursor
              hasNextPage
            }
            nodes {
              # Use inline fragments to get the specific value based on the field type
              ... on ProjectV2ItemFieldTextValue {
                field { ... on ProjectV2FieldCommon { name } }
                text
              }
              ... on ProjectV2ItemFieldNumberValue {
                field { ... on ProjectV2FieldCommon { name } }
                number
              }
              ... on ProjectV2ItemFieldDateValue {
                field { ... on ProjectV2FieldCommon { name } }
                date
              }
              ... on ProjectV2ItemFieldSingleSelectValue {
                field { ... on ProjectV2FieldCommon { name } }
                name # The selected option's name
                optionId # ID of the selected option
              }
              ... on ProjectV2ItemFieldIterationValue {
                field { ... on ProjectV2FieldCommon { name } }
                title
                iterationId
                startDate
                duration
              }
              ... on ProjectV2ItemFieldUserValue {
                 field { ... on ProjectV2FieldCommon { name } }
                 users(first: 10) { # Get up to 10 users per field
                   nodes { login id }
                 }
              }
              ... on ProjectV2ItemFieldLabelValue {
                 field { ... on ProjectV2FieldCommon { name } }
                 labels(first: 10) { # Get up to 10 labels per field
                   nodes { name color id }
                 }
              }
              ... on ProjectV2ItemFieldMilestoneValue {
                 field { ... on ProjectV2FieldCommon { name } }
                 milestone { title number state id }
              }
              ... on ProjectV2ItemFieldRepositoryValue {
                 field { ... on ProjectV2FieldCommon { name } }
                 repository { name nameWithOwner id }
              }
              ... on ProjectV2ItemFieldPullRequestValue {
                 field { ... on ProjectV2FieldCommon { name } }
                 pullRequests(first: 5) { # Get up to 5 linked PRs
                   nodes { number title url id }
                 }
              }
              ... on ProjectV2ItemFieldReviewerValue {
                 field { ... on ProjectV2FieldCommon { name } }
                 reviewers(first: 10) { # Get up to 10 reviewers
                   nodes {
                      ... on User { login id }
                      ... on Team { name id }
                      ... on Mannequin { login id }
                   }
                 }
              }
            }
          }

          # --- Get Core Content Details ---
          # Use inline fragments based on the item's 'type'
          content {
            ... on DraftIssue {
              id
              title
              body
              assignees(first: 10) { nodes { login id } }
              creator { __typename ...on Actor { login } }
            }
            ... on Issue {
              id
              number
              title
              body
              url
              state
              stateReason
              createdAt
              closedAt
              author { login }
              assignees(first: 10) { nodes { login id } }
              labels(first: 10) { nodes { name color id } }
              milestone { title number state id }
              repository { name nameWithOwner id }
              # Add other Issue fields as needed
            }
            ... on PullRequest {
              id
              number
              title
              body
              url
              state # OPEN, CLOSED, MERGED
              createdAt
              closedAt
              mergedAt
              author { login }
              assignees(first: 10) { nodes { login id } }
              labels(first: 10) { nodes { name color id } }
              milestone { title number state id }
              repository { name nameWithOwner id }
              headRefName
              baseRefName
              reviewDecision # REVIEW_REQUIRED, APPROVED, CHANGES_REQUESTED, etc.
              # Add other PullRequest fields as needed
            }
          }
        }
      }
    }
  }
}`