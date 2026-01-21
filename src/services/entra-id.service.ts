/**
 * Service for interacting with Microsoft Entra ID (Azure AD)
 * Fetches users from Entra ID using Microsoft Graph API
 */

interface EntraIdUser {
  id: string;
  mail?: string;
  userPrincipalName?: string;
  displayName?: string;
  givenName?: string;
  surname?: string;
  accountEnabled?: boolean;
}

interface GraphApiResponse {
  value: EntraIdUser[];
  "@odata.nextLink"?: string;
}

interface AccessTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface SignInStatus {
  errorCode?: number;
}

interface SignInEvent {
  createdDateTime?: string;
  status?: SignInStatus;
}

interface SignInResponse {
  value: SignInEvent[];
  "@odata.nextLink"?: string;
}

/**
 * Get access token for Microsoft Graph API using client credentials flow
 */
async function getAccessToken(
  tenantId: string,
  clientId: string,
  clientSecret: string,
): Promise<string> {
  const tokenEndpoint = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials",
  });

  try {
    const response = await fetch(tokenEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to get access token: ${response.status} ${errorText}`,
      );
    }

    const data = (await response.json()) as AccessTokenResponse;
    return data.access_token;
  } catch (error) {
    throw new Error(
      `Error getting access token: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Fetch all users from Entra ID for a given tenant
 */
async function fetchUsersFromEntraId(
  tenantId: string,
  clientId: string,
  clientSecret: string,
  domain: string,
): Promise<EntraIdUser[]> {
  const accessToken = await getAccessToken(tenantId, clientId, clientSecret);

  const graphApiUrl = "https://graph.microsoft.com/v1.0/users";
  const allUsers: EntraIdUser[] = [];
  let nextLink: string | undefined =
    `${graphApiUrl}?$select=id,mail,userPrincipalName,displayName,givenName,surname,accountEnabled&$top=999`;

  while (nextLink) {
    try {
      const response = await fetch(nextLink, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          ConsistencyLevel: "eventual",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to fetch users from Graph API: ${response.status} ${errorText}`,
        );
      }

      const data = (await response.json()) as GraphApiResponse;
      allUsers.push(...data.value);
      nextLink = data["@odata.nextLink"];
    } catch (error) {
      throw new Error(
        `Error fetching users from Entra ID: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  return allUsers;
}

/**
 * Convert Entra ID user to application user format
 */
function convertEntraIdUserToAppUser(
  entraUser: EntraIdUser,
): { email: string; name: string; oid: string } | null {
  const email = entraUser.mail || entraUser.userPrincipalName;
  const name =
    entraUser.displayName ||
    `${entraUser.givenName || ""} ${entraUser.surname || ""}`.trim() ||
    email ||
    "Unknown";

  if (!email) {
    return null;
  }

  return {
    email,
    name,
    oid: entraUser.id,
  };
}

/**
 * Get users from Entra ID for a tenant and convert to application format
 */
export async function getUsersFromEntraId(
  domain: string,
): Promise<Array<{ email: string; name: string; oid: string }>> {
  const tenantId = process.env.ENTRA_ID_TENANT_ID || "";
  const clientId = process.env.ENTRA_ID_CLIENT_ID || "";
  const clientSecret = process.env.ENTRA_ID_CLIENT_SECRET || "";
  if (!tenantId || !clientId || !clientSecret || !domain) {
    return [];
  }
  try {
    const entraUsers = await fetchUsersFromEntraId(
      tenantId,
      clientId,
      clientSecret,
      domain,
    );
    const normalizedDomain = domain.trim().toLowerCase();
    const filteredUsers = entraUsers.filter((user) => {
      const mail = user.mail?.toLowerCase();
      const upn = user.userPrincipalName?.toLowerCase();
      const matchesMail = mail ? mail.endsWith(`@${normalizedDomain}`) : false;
      const matchesUpn = upn ? upn.includes(`_${normalizedDomain}`) : false;
      return matchesMail || matchesUpn;
    });
    const convertedUsers = filteredUsers
      .map(convertEntraIdUserToAppUser)
      .filter(
        (user): user is { email: string; name: string; oid: string } =>
          user !== null,
      );

    return convertedUsers;
  } catch (error) {
    throw new Error(
      `Failed to get users from Entra ID: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

async function fetchSignIns(
  tenantId: string,
  clientId: string,
  clientSecret: string,
  startIso: string,
  endIso: string,
): Promise<SignInEvent[]> {
  const accessToken = await getAccessToken(tenantId, clientId, clientSecret);
  const baseUrl = "https://graph.microsoft.com/v1.0/auditLogs/signIns";
  const filter = `createdDateTime ge ${startIso} and createdDateTime le ${endIso}`;
  let nextLink: string | undefined = `${baseUrl}?$select=createdDateTime,status&$top=999&$filter=${encodeURIComponent(
    filter,
  )}`;
  const events: SignInEvent[] = [];

  while (nextLink) {
    const response = await fetch(nextLink, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        ConsistencyLevel: "eventual",
      },
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to fetch sign-ins from Graph API: ${response.status} ${errorText}`,
      );
    }
    const data = (await response.json()) as SignInResponse;
    events.push(...data.value);
    nextLink = data["@odata.nextLink"];
  }

  return events;
}

export type LoginStatsRange = "today" | "last7days" | "lastmonth" | "lastyear";

export async function getLoginStats(range: LoginStatsRange) {
  const tenantId = process.env.ENTRA_ID_TENANT_ID || "";
  const clientId = process.env.ENTRA_ID_CLIENT_ID || "";
  const clientSecret = process.env.ENTRA_ID_CLIENT_SECRET || "";
  if (!tenantId || !clientId || !clientSecret) {
    throw new Error("Missing Entra ID configuration");
  }

  const now = new Date();
  let start = new Date(now);
  switch (range) {
    case "today":
      start = new Date(now);
      start.setUTCHours(0, 0, 0, 0);
      break;
    case "last7days":
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "lastmonth":
      start = new Date(now);
      start.setUTCMonth(start.getUTCMonth() - 1);
      break;
    case "lastyear":
      start = new Date(now);
      start.setUTCFullYear(start.getUTCFullYear() - 1);
      break;
    default:
      break;
  }

  const startIso = start.toISOString();
  const endIso = now.toISOString();
  const events = await fetchSignIns(tenantId, clientId, clientSecret, startIso, endIso);

  let successCount = 0;
  let failureCount = 0;
  for (const event of events) {
    const errorCode = event.status?.errorCode ?? 0;
    if (errorCode === 0) {
      successCount += 1;
    } else {
      failureCount += 1;
    }
  }

  return {
    range,
    from: startIso,
    to: endIso,
    successCount,
    failureCount,
  };
}
