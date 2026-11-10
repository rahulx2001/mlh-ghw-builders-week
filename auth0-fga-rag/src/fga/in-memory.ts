import type { AuthorizationChecker, FgaTuple } from "../types.ts";

/**
 * IN-MEMORY AUTHORIZATION CHECKER (fallback only).
 *
 * This is not a production authorization engine. It evaluates the same
 * relationship shapes used by fga/model.fga so tests and the demo UI can
 * run when a live OpenFGA / Auth0 FGA store is not configured.
 *
 * Supported:
 *   - direct tuples (user:alice, viewer, document:x)
 *   - userset tuples (role:manager#assignee, viewer, document:x)
 *   - computed owner -> viewer -> can_view
 */
export class InMemoryAuthorizationChecker implements AuthorizationChecker {
  readonly backendName = "in-memory (labelled fallback; not OpenFGA)";
  private readonly tuples: FgaTuple[];

  constructor(tuples: FgaTuple[]) {
    this.tuples = tuples;
  }

  async check(user: string, relation: string, object: string): Promise<boolean> {
    const [objectType] = object.split(":");
    if (objectType === "document" && (relation === "can_view" || relation === "viewer")) {
      if (this.hasDirect(user, "owner", object)) return true;
      if (this.hasDirect(user, "viewer", object)) return true;
      if (this.matchesUsersetViewer(user, object)) return true;
      return false;
    }
    return this.hasDirect(user, relation, object);
  }

  async batchCheck(
    checks: Array<{ user: string; relation: string; object: string }>
  ): Promise<boolean[]> {
    return Promise.all(checks.map((c) => this.check(c.user, c.relation, c.object)));
  }

  async listObjects(user: string, relation: string, type: string): Promise<string[]> {
    const objectIds = new Set<string>();
    for (const tuple of this.tuples) {
      if (tuple.object.startsWith(`${type}:`)) {
        objectIds.add(tuple.object);
      }
    }
    const allowed: string[] = [];
    for (const object of objectIds) {
      if (await this.check(user, relation, object)) {
        allowed.push(object);
      }
    }
    return allowed;
  }

  private hasDirect(user: string, relation: string, object: string): boolean {
    return this.tuples.some(
      (t) => t.user === user && t.relation === relation && t.object === object
    );
  }

  private usersWithRelation(relation: string, object: string): string[] {
    return this.tuples
      .filter((t) => t.relation === relation && t.object === object)
      .map((t) => t.user);
  }

  private matchesUsersetViewer(user: string, document: string): boolean {
    const viewers = this.usersWithRelation("viewer", document);
    for (const viewer of viewers) {
      const hash = viewer.indexOf("#");
      if (hash === -1) continue;
      const relatedObject = viewer.slice(0, hash);
      const relatedRelation = viewer.slice(hash + 1);
      if (this.hasDirect(user, relatedRelation, relatedObject)) {
        return true;
      }
    }
    return false;
  }
}
