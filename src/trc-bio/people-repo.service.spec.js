describe('TRC Person repository', function () {
  var $httpBackend, repo;

  beforeEach(module('trcBio', function (peopleRepoProvider) {
    peopleRepoProvider.url = '/test/api/people';
  }));

  beforeEach(inject(function ($injector) {
    $httpBackend = $injector.get('$httpBackend');

    $httpBackend.when('GET', '/test/api/people?q=test')
      .respond({
        items: [{
          meta: {
            slug: 'foo',
            version: 1,
            links: {},
            lastModified: '2016-03-01T17:23:47-0600'
          },
          id: 'foo',
          name: {
            role: null,
            label: 'Matthew Barry',
            title: null,
            givenName: 'Matthew',
            middleName: 'James',
            familyName: 'Barry',
            suffix: null
          },
          label: 'Matthew Barry (1991-?)',
          summaryExcerpt: 'blah blah blah'
        }],
        qs: '?q=test',
        qsNext: null,
        qsPrev: null
      });

    $httpBackend.when('GET', '/test/api/people/test')
      .respond({
        meta: {
          slug: 'foo',
          version: 1,
          links: {},
          lastModified: '2016-03-01T17:23:47-0600'
        },
        id: 'test',
        name: {
          role: null,
          label: 'Matthew Barry',
          title: null,
          givenName: 'Matthew',
          middleName: 'James',
          familyName: 'Barry',
          suffix: null
        },
        altNames: [],
        birth: {
          id: null,
          title: null,
          description: null,
          location: 'Bryan, TX',
          date: {
            calendar: '1991-12-29',
            description: '29 Dec 1991'
          }
        },
        death: null,
        summary: 'blah blah blah'
      });

    repo = $injector.get('peopleRepo');
  }));

  afterEach(function () {
    $httpBackend.verifyNoOutstandingExpectation();
    $httpBackend.verifyNoOutstandingRequest();
  });

  it('should list search results by name', function () {
    $httpBackend.expectGET('/test/api/people?q=test');
    var people = repo.find('test');
    $httpBackend.flush();
    expect(people.items.length).toBe(1);
  });

  it('should fetch a person by id', function () {
    $httpBackend.expectGET('/test/api/people/test');
    var person = repo.get('test');
    $httpBackend.flush();
    expect(person).toBeTruthy();
    expect(person.id).toBe('test');
    expect(person.name.label).toBe('Matthew Barry');
  });

  it('should create a new empty person model', function () {
    var person = repo.create();

    expect(person).toBeTruthy();
    expect(person.id).toBeNull();
    expect(person.name).toBeTruthy();
  });

  // it('should create a new person model with the given data', function () {
  //   var person = repo.create({
  //     name: {
  //       role: 'name',
  //       label: 'Matthew J. Barry',
  //       givenName: 'Matthew',
  //       middleName: 'James',
  //       familyName: 'Barry'
  //     },
  //     birth: {
  //       location: 'Bryan, TX',
  //       date: {
  //         calendar: '1991-12-20',
  //         description: 'Winter 1991'
  //       }
  //     }
  //   });
  //
  //   expect(person.name.label).toBe('Matthew J. Barry');
  //   expect(person.name.givenName).toBe('Matthew');
  //   expect(person.name.middleName).toBe('James');
  //   expect(person.name.familyName).toBe('Barry');
  //   expect(person.birth.date.calendar).toBe('1991-12-20');
  //   expect(person.birth.id).toBeNull();
  // });

  it('should save a new person, setting the generated ID on success', function () {
    var person = repo.create();
    angular.merge(person, {
      meta: {
        slug: 'foo',
        version: 1,
        lastModified: '2016-03-01T17:23:47-06:00'
      },
      name: {
        label: 'Matthew Barry',
        givenName: 'Matthew',
        middleName: 'James',
        familyName: 'Barry'
      },
      birth: {
        location: 'Bryan, TX',
        date: {
          calendar: '1991-12-29',
          description: '29 Dec 1991'
        }
      },
      summary: 'blah blah blah'
    });

    $httpBackend.expectPOST('/test/api/people', person).respond(200, { id: 'test' });
    repo.save(person);
    $httpBackend.flush();
    expect(person.id).toBe('test');
  });

  it('should save an existing person', function () {
    var person = repo.create({ id: 'test' });
    $httpBackend.expectPUT('/test/api/people/test', person).respond(200, { id: 'test' });
    repo.save(person);
    $httpBackend.flush();
    expect(person.id).toBe('test');
  });

  it('should delete a person by object', function () {
    var person = repo.create({ id: 'test' });

    $httpBackend.expectDELETE('/test/api/people/test').respond(204, '');
    repo.delete(person).then(angular.noop, fail);
    $httpBackend.flush();
    expect(person.id).toBeNull();
  });

  it('should delete a person by id', function () {
    $httpBackend.expectDELETE('/test/api/people/test').respond(204, '');
    repo.delete('test').then(angular.noop, fail);
    $httpBackend.flush();
  });

});
