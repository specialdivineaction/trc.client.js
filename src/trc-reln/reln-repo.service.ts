import * as angular from 'angular';

// NOTE: this entire API model *WILL* eventually change

interface INormalizedRelationship {
  /**
   * The id of the original relationship
   * @type {string}
   */
  id: string;

  /**
   * The root token used to determine the directedness of this relationship
   * @type {string}
   */
  root: string;

  /**
   * The relationship's type id
   * @type {string}
   */
  typeId: string;

  /**
   * Whether this relationship is in the reverse direction relative to the root entry
   * @type {boolean}
   */
  reverse: boolean;

  /**
   * A description of this relationship
   * @type {string}
   */
  description: string;

  /**
   * A set of anchors on the receiving end of this relationship relative to the root entry
   * @type {IAnchor[]}
   */
  anchors: IAnchor[];
}

interface IDirectionGroup {
  /**
   * Relationships in the forward direction
   * @type {INormalizedRelationship[]}
   */
  forward: INormalizedRelationship[];

  /**
   * Relationships in the reverse direction
   * @type {INormalizedRelationship[]}
   */
  reverse: INormalizedRelationship[];
}

interface ITypeGroup {
  /**
   * Potentially directed display label for group
   * @type {string}
   */
  label: string;

  /**
   * The type corresponding to this group
   * @type {IRelationshipType}
   */
  type: IRelationshipType;

  /**
   * For directed types, specifies the directionality of relationships in this group
   * @type {boolean}
   */
  reverse?: boolean;

  /**
   * Relationships of the same type and direction
   * @type {INormalizedRelationship[]}
   */
  relationships: INormalizedRelationship[];
}

interface IRelationshipType extends angular.resource.IResource<IRelationshipType> {
  /**
   * A unique identifier for this type
   * @type {string}
   */
  identifier: string;

  /**
   * A label to display for this type
   * @type {string}
   */
  title: string;

  /**
   * If this type is directed, the label to display for reverse relationships
   * @type {string}
   */
  reverseTitle: string;

  /**
   * A more detailed description of this type
   * @type {string}
   */
  description: string;

  /**
   * Whether this type is directed (true) or undirected (false)
   * @type {boolean}
   */
  isDirected: boolean;
}

interface IRelationship extends angular.resource.IResource<IRelationship> {
  /**
   * A unique identifier for this relationship
   * @type {string}
   */
  id: string;

  /**
   * Self-identifying information for this relationship.
   * @type {IEntryReference}
   */
  ref: IEntryReference;

  /**
   * The id of the relationship type (see IRelationshipType)
   * @type {string}
   */
  typeId: string;

  /**
   * A detailed description of this relationship
   * @type {string}
   */
  description: string;

  /**
   * A set of anchors that relate multiple entries in an undirected relationship or
   * the "source" entries in a directed relationship
   * @type {IAnchor[]}
   */
  related: IAnchor[];

  /**
   * A set of anchors that serve as the "target" entries in a directed relationship
   * @type {IAnchor[]}
   */
  targets: IAnchor[];

  $update(): angular.IPromise<IRelationship>;
}

interface ISimpleRelationship extends angular.resource.IResource<ISimpleRelationship> {
  /**
   * A unique identifier for this relationship (required only during update requests)
   * @type {string}
   */
  id?: string;

  /**
   * The id of the relationship type (see IRelationshipType)
   * @type {string}
   */
  typeId: string;

  /**
   * A detailed description of this relationship
   * @type {string}
   */
  description: string;

  /**
   * A set of anchors that relate multiple entries in an undirected relationship or
   * the "source" entries in a directed relationship
   * @type {ISimpleAnchor[]}
   */
  related: ISimpleAnchor[];

  /**
   * A set of anchors that serve as the "target" entries in a directed relationship
   * @type {ISimpleAnchor[]}
   */
  targets: ISimpleAnchor[];
}

interface IAnchor {
  /**
   * A display label for this anchor (e.g. the title of a work or name of a person)
   * @type {string}
   */
  label: string;

  /**
   * Identifying information about the referenced object
   * @type {IEntryReference}
   */
  ref: IEntryReference;

  /**
   * Arbitrary key/value(s) mapping for additional anchor metadata
   */
  properties: IProperties;
}

type IProperties = { [key: string]: string[] };

interface ISimpleAnchor {
  /**
   * A display label for this anchor (e.g. the title of a work or name of a person)
   * @type {string}
   */
  label: string;

  /**
   * Token of the referenced entry
   * @type {string}
   */
  ref: string;

  /**
   * Arbitrary key/value(s) mapping for additional anchor metadata
   */
  properties: IProperties;
}

interface IEntryReference {
  /**
   * The (locally) unique identifier of the target entity
   * @type {string}
   */
  id: string;

  /**
   * A semantic type identifier of the referenced entity
   * @type {string}
   */
  type: string;

  /**
   * A (globally) unique token that arbitrarily identifies the target entity
   * @type {string}
   */
  token: string;
}

type IRelationshipTypeResource = angular.resource.IResourceClass<IRelationshipType>

interface IRelationshipResource extends angular.resource.IResourceClass<IRelationship | ISimpleRelationship> {
  update(reln: ISimpleRelationship): IRelationship;
}

export class RelnRepoProvider {
  url: string = '/api/relationships';

  /** @ngInject */
  $get($q: angular.IQService, $resource: angular.resource.IResourceService) {
    const typeResource = <IRelationshipTypeResource> $resource(`${this.url}/types/:id`, { id: '@identifier' });

    const relnResource = <IRelationshipResource> $resource(`${this.url}/:id`, { id: '@id' }, {
      update: { method: 'PUT' }
    });

    return new RelnRepo(typeResource, relnResource, $q);
  }
}

type RelationshipTypeMap = { [typeId: string]: IRelationshipType };

export class RelnRepo {
  typeResource: IRelationshipTypeResource;
  relnResource: IRelationshipResource;

  private $q: angular.IQService;
  private typesCache: RelationshipTypeMap;

  constructor(typeResource: IRelationshipTypeResource, relnResource: IRelationshipResource, $q: angular.IQService) {
    this.typeResource = typeResource;
    this.relnResource = relnResource;
    this.$q = $q;
  }

  /**
   * Fetches relationship types from the server, caching them in the process.
   * The returned array will be populated when the request resolves.
   * The underlying promise is available on the $promise property.
   * @param {boolean} [forceReload=false] Whether to discard cached values and refetch
   * @return {RelationshipTypeMap}
   */
  getTypes(forceReload: boolean = false): RelationshipTypeMap {
    if (!this.typesCache || forceReload) {
      const types = this.typeResource.query();

      this.typesCache = {
        $promise: null
      };

      var tcPromise = types.$promise.then(() => {
        types.forEach(type => this.typesCache[type.identifier] = type);
        return this.typesCache;
      });

      Object.defineProperty(this.typesCache, '$promise', {
        value: tcPromise
      });
    }

    return this.typesCache;
  }

  /**
   * Fetches a type by ID
   *
   * @param {string} id
   * @return {Promise.<RelationshipType>}
   */
  getType(id: string): angular.IPromise<IRelationshipType> {
    var types = <any> this.getTypes();
    return types.$promise.then(types => types[id]);
  }

  /**
   * Creates a new empty relationship instance
   *
   * @return {IRelationship}
   */
  createRelationship(): ISimpleRelationship {
    var reln = <ISimpleRelationship> new this.relnResource();
    reln.related = [];
    reln.targets = [];
    return reln;
  }

  /**
   * Creates a new empty anchor model
   *
   * @param {string} label
   * @param {string} token
   * @param {Object.<string, string>} properties
   * @return {IAnchor}
   */
  createAnchor(label: string, token: string, properties: {[prop: string]: string[]} = {}): ISimpleAnchor {
    return {
      label,
      ref: token,
      properties
    };
  }

  /**
   * Retrieves a relationship from the server by ID.
   * The returned model will be populated once the request succeeds.
   * The underlying promise can be accessed via the $promise property.
   *
   * @param {string} id
   * @return {Relationship}
   */
  get(id: string): IRelationship {
    return <IRelationship> this.relnResource.get({id});
  }

  /**
   * Find all relationships matching the given criteria.
   * @param  {string} token
   * @param {IProperties} properties
   * @return {Relationship[]}
   */
  search(token: string, properties?: IProperties): IRelationship[] {
    const relns = <IRelationship[]> this.relnResource.query({ entity: token });

    if (!properties) {
      return relns;
    }

    const filtered = [];

    const filteredP = relns.$promise.then(() => {
      relns.filter(r => this.contains(token, properties, r)).forEach(r => filtered.push(r));
      return filtered;
    });

    Object.defineProperty(filtered, '$promise', {
      value: filteredP
    });

    return filtered;
  }

  /**
   * Saves a relationship back to the server.
   *
   * @param {IRelationship} reln
   * @return {angular.IPromise<IRelationship>} resolves on successful save
   */
  save(reln: IRelationship): angular.IPromise<IRelationship> {
    if (!(reln instanceof this.relnResource)) {
      throw new Error('Relationship was not created by this repo');
    }

    return reln.id
      ? reln.$update()
      : reln.$save();
  }

  /**
   * Deletes a relationship from the server via the REST API.
   *
   * @param {string} id
   * @return {angular.IPromise<IRelationship>} resolves on success
   */
  delete(id: string): angular.IPromise<IRelationship> {
    var response = <IRelationship> this.relnResource.delete({id});
    return response.$promise;
  }

  /**
   * Normalizes relationships into type groups (relative to the given root token)
   * that are more suitable for display in the UI.
   * @param {IRelationship[]} relns
   * @param {string} root
   * @return {ITypeGroup[]}
   */
  normalizeRelationships(relns: IRelationship[], root: string): ITypeGroup[] {
    const normRelns = relns.map(reln => this.normalizeRelationship(reln, root));
    const relnsByTypeDirection: { [typeId: string]: IDirectionGroup } = {};

    normRelns.forEach(reln => {
      const typeId = reln.typeId;

      if (!relnsByTypeDirection.hasOwnProperty(typeId)) {
        relnsByTypeDirection[typeId] = {
          forward: [],
          reverse: []
        };
      }

      relnsByTypeDirection[typeId][reln.reverse ? 'reverse' : 'forward'].push(reln);
    });

    const typeGroups: ITypeGroup[] = [];
    const typeGroupPs: angular.IPromise<any>[] = [];

    angular.forEach(relnsByTypeDirection, (directions, typeId) => {
      const typeP = this.getType(typeId);

      const groupP = typeP.then(type => {
        if (type.isDirected) {
          // add forward group
          if (directions.forward.length > 0) {
            typeGroups.push({
              label: type.title,
              type: type,
              reverse: false,
              relationships: directions.forward
            });
          }

          // add reverse group
          if (directions.reverse.length > 0) {
            typeGroups.push({
              label: type.reverseTitle,
              type: type,
              reverse: true,
              relationships: directions.reverse
            });
          }
        } else {
          // combine forward/reverse and add as a single undirected group
          var group = directions.forward.concat(directions.reverse);
          if (group.length > 0) {
            typeGroups.push({
              label: type.title,
              type: type,
              relationships: group
            });
          }
        }
      });

      typeGroupPs.push(groupP);
    });

    Object.defineProperty(typeGroups, '$promise', {
      value: this.$q.all(typeGroupPs).then(() => typeGroups)
    });

    return typeGroups;
  }

  /**
   * Returns whether an anchor having the supplied token/properties is contained within
   * the supplied relationship according to the following test:
   *
   * anchorA in reln iff
   *   exists anchorB in (reln.related union reln.targets)
   *     (anchorA.ref.token == anchorB.ref.token) and
   *     forall (prop, values) in anchorA.properties
   *       values != [] implies (anchorB.properties[prop] intersect values) != []
   *
   * @param {string} token
   * @param {IProperties} properties
   * @param {IRelationship} reln
   * @return {boolean}
   */
  private contains(token: string, properties: IProperties, reln: IRelationship): boolean {
    const anchors = reln.related.concat(reln.targets);
    return anchors.some(inheritsFrom);

    function inheritsFrom(anchor: IAnchor): boolean {
      if (anchor.ref.token !== token) {
        return false;
      }

      return Object.keys(properties).every(prop => {
        if (properties[prop].length === 0) {
          return true;
        }

        if (!anchor.properties.hasOwnProperty(prop)) {
          return false;
        }

        return properties[prop].some(value => anchor.properties[prop].indexOf(value) >= 0);
      });
    }
  }

  /**
   * Normalizes the given relationship as seen from the given root token
   * This method assumes that the root token is contained in either the related or targets anchor set
   * @param {IRelationship} reln
   * @param {string} root
   * @return {INormalizedRelationship}
   */
  private normalizeRelationship(reln: IRelationship, root: string): INormalizedRelationship {
    const reverse = reln.targets.some(anchor => anchor.ref.token === root);

    return {
      id: reln.id,
      root,
      typeId: reln.typeId,
      reverse,
      description: reln.description,
      anchors: reverse ? reln.related.filter(anchor => anchor.ref.token !== root) : reln.targets
    };
  }
}
