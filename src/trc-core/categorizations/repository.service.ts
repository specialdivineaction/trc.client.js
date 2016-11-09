import * as angular from 'angular';

// const Strategies = {
//   set: 'set',
//   list: 'list',
//   tree: 'hierarchical'
// };

interface ICategorizationDesc {
  key: string;
  label: string;
  description: string;
  type: string;
}

interface ICategorization extends angular.resource.IResource<ICategorization> {
  meta: ICategorizationMeta;
  key: string;
  label: string;
  description: string;
  type: string;
  entries?: IBasicNode[];
  root?: IBasicTreeNode;
}

interface ICategorizationMeta {
  id: string;
  version: number;
  dateCreated: string;
  dateModified: string;
}

interface IBasicNode extends angular.resource.IResource<IBasicNode> {
  id: string;
  schemeId: string;
  version: number;
  slug: string;
  label: string;
  description: string;
  entryRef: IEntryReference;
}

interface IBasicTreeNode extends IBasicNode {
  childIds: string[];
  children: IBasicNode[];
}

interface IEntryReference extends angular.resource.IResource<IEntryReference> {
  type: string;
  id: string;
  version: number;
  $update(): angular.IPromise<IEntryReference>;
}

interface ICategorizationResource extends angular.resource.IResourceClass<ICategorization> {
}

interface INodeResource extends angular.resource.IResourceClass<IBasicNode> {
}

interface IEntryReferenceResource extends angular.resource.IResourceClass<IEntryReference> {
  update(prams: angular.resource.IResourceOptions, entryRef: IEntryReference): IEntryReference;
}


interface ICategorizationResources {
  schemes: ICategorizationResource;
  nodes: INodeResource;
  nodeChildren: INodeResource;
  associatedEntries: IEntryReferenceResource;
}

export class CategorizationRepoProvider {
  url: string = '/api/categorizations';

  /** @ngInject */
  $get($q: angular.IQService, $resource: angular.resource.IResourceService): CategorizationRepo {
    const schemes = <ICategorizationResource> $resource(`${this.url}/:scopeId/:key`, {
      key: '@key'
    });

    const nodes = <INodeResource> $resource(`${this.url}/:scopeId/:schemeId/nodes/:nodeId`, {
      schemeId: '@schemeId',
      nodeId: '@nodeId'
    });

    const nodeChildren = <INodeResource> $resource(`${this.url}/:scopeId/:schemeId/nodes/:nodeId/children`, {
      schemeId: '@schemeId',
      nodeId: '@nodeId'
    });

    const associatedEntries = <IEntryReferenceResource> $resource(`${this.url}/:scopeId/:schemeId/nodes/:nodeId/entryRef`, {
      schemeId: '@schemeId',
      nodeId: '@nodeId'
    }, {
      update: {
        method: 'PUT'
      }
    });

    return new CategorizationRepo({schemes, nodes, nodeChildren, associatedEntries});
  }
}

class CategorizationRepo {
  private resources: ICategorizationResources;

  constructor(resources: ICategorizationResources) {
    this.resources = resources;
  }

  /**
   * Creates a new ScopedRepository.
   * @param {string} scopeId The scope id that will be used by this repository
   */
  getScopedRepo(scopeId: string): ScopedRepository {
    return new ScopedRepository(scopeId, this.resources);
  }
}

/**
 * The primary API for working with categorizations. Categorizations
 * are defined relative to a scope id.
 *
 * TODO explain why here.
 */
class ScopedRepository {
  nodes: NodeRepository;

  private resources: ICategorizationResources;
  private scopeId: string;

  constructor(scopeId: string, resources: ICategorizationResources) {
    this.scopeId = scopeId;
    this.resources = resources;
    this.nodes = new NodeRepository(scopeId, resources);
  }

  get(key: string): ICategorization {
    return this.resources.schemes.get({
      scopeId: this.scopeId,
      key
    });
  }

  create(key: string, label: string, description: string, type: string) {
    // TODO convert to object
    // TODO VERIFY KEY, check uniqueness
    // const data = {key, label, description, type};
    return null;
  }

  remove(key: string) {
    return null;
  }
}

class NodeRepository {
  private scopeId: string;
  private resources: ICategorizationResources;

  constructor(scopeId: string, resources: ICategorizationResources) {
    this.scopeId = scopeId;
    this.resources = resources;
  }

  get(schemeId: string, nodeId: string): IBasicNode {
    return null;
  }

  getChildren(node: string | IBasicNode): IBasicNode[] {
    return null;
  }

  create(parent: IBasicTreeNode, label: string, description: string): IBasicNode {
    const options = {
      scopeId: this.scopeId,
      schemeId: parent.schemeId,
      nodeId: parent.id
    };

    const data = {label, description};

    const result = this.resources.nodeChildren.save(options, data);

    result.$promise.then(node => {
      parent.childIds.push(node.id);
      parent.children.push(node);
    });

    return result;
  }

  move() {
    return null;
  }

  remove(node: IBasicNode, removeRefs: boolean, parent: IBasicTreeNode): angular.IPromise<any> {
    const result = this.resources.nodes.delete({
      scopeId: this.scopeId,
      schemeId: node.schemeId,
      nodeId: node.id,
      remove_refs: removeRefs
    });

    if (parent) {
      // remove child from parent node
      result.$promise.then(() => {
        const ix = parent.children.indexOf(node);
        if (ix >= 0) {
          parent.children.splice(ix, 1);
        }
      });
    }

    return result.$promise;
  }

  update() {
    return null;
  }

  link(node: IBasicNode, entryRef: IEntryReference): IEntryReference {
    const params = {
      scopeId: this.scopeId,
      schemeId: node.schemeId,
      nodeId: node.id
    };

    const result = this.resources.associatedEntries.update(params, entryRef);

    result.$promise.then(ref => node.entryRef = ref);

    return result;
  }

  unlink(node: IBasicNode, entryRef: IEntryReference): IEntryReference {
    const params = {
      scopeId: this.scopeId,
      schemeId: node.schemeId,
      nodeId: node.id
    };

    const result = this.resources.associatedEntries.delete(params);

    result.$promise.then(() => node.entryRef = null);

    return result;
  }

}
