const _ = require('lodash')

const DatabasesParser = require('./backend/adapters/databases-parser')
const ResourceFactory = require('./backend/adapters/resource-factory')
const Renderer = require('./backend/utils/renderer')
const BaseDecorator = require('./backend/utils/base-decorator')
const BaseResource = require('./backend/adapters/base/resource')
const BaseDatabase = require('./backend/adapters/base/database')
const BaseRecord = require('./backend/adapters/base/record')
const BaseProperty = require('./backend/adapters/base/property')
const ValidationError = require('./backend/utils/validation-error')

const Routes = require('./backend/routes')

/**
 * @typedef {Object} AdminBroOptions
 *
 * @description AdminBro takes list of options of the entire framework. All off them
 * have default values, but you can tailor them to your needs easily
 *
 * @property {String} [rootPath='/admin']             under which path AdminBro will be available
 * @property {String} [logoutPath='/admin/logout']    url to logout action
 * @property {String} [loginPath='/admin/login']      url to login page
 * @property {BaseDatabase[]} [databases=[]]         array of all databases
 * @property {BaseResource[] | Object[]} [resources=[]] array of all resources. Resources can be
 *                                                    give as in a regular way or nested within
 *                                                    an object along with its decorator
 * @property {BaseResource} [resources[].resource]    class which extends {@link BaseResource}
 * @property {BaseDecorator} [resources[].decorator]  class which extends {@link BaseDecorator}
 * @property {Object} [branding]                      branding settings
 * @property {String} [branding.logo]                 logo shown in AdminBro in top left corner
 * @property {String} [branding.companyName]          company name
 * @property {Boolean} [branding.softwareBrothers]    if software brothers logos should be shown
 *                                                    in the sidebar footer
 *
 * @example
 * const AdminBro = require('admin-bro')
 *
 * const ArticleDecorator = require('./article-decorator')
 * const ArticleModel = require('./article')
 *
 * const connection = await mongoose.connect(process.env.MONGO_URL)
 *
 * const adminBro = new AdminBro({
 *   rootPath: '/xyz-admin',
 *   logoutPath: '/xyz-admin/exit',
 *   loginPath: '/xyz-admin/sign-in',
 *   databases: [connection]
 *   resources: [{ resource: ArticleModel, decorator: ArticleDecorator}]
 *   branding: {
 *     companyName: 'XYZ c.o.'
 *   }
 * })
 */
const defaults = {
  rootPath: '/admin',
  logoutPath: '/admin/logout',
  loginPath: '/admin/login',
  databases: [],
  resources: [],
  branding: {
    logo: 'https://softwarebrothers.co/assets/images/software-brothers-logo-compact.svg',
    companyName: 'Company Name',
    softwareBrothers: true,
  },
}

/**
 * Main class for Admin extension. It takes {@link AdminBroOptions} as an
 * parameter and creates admin instance.
 *
 * Its main responsibility is to fetch all resources and/or databases given by
 * user. Than its instance is a currier - injected in all other classes.
 *
 */
class AdminBro {
  /**
   * @param  {AdminBroOptions}   options
   */
  constructor(options = {}) {
    /**
     * @type {BaseResource[]}
     * @description List of all resources available for the AdminBro
     */
    this.resources = []

    /**
     * @type {AdminBroOptions}
     * @description Options gave by the user
     */
    this.options = _.merge(defaults, options)

    this.findResources(options)
  }


  /**
   * Find all resources given by user. When, along with the resource
   * its {@link BaseDecorator} is given - it also attaches it using
   * BaseResource#assignDecorator
   *
   * @param {BaseDatabase[]} [databases=[]]    list of all databases
   * @param {BaseResource[] | Object[]} [resources=[]]    list of all resources along
   *                                                      with optional decorators. Take
   *                                                      a look at {@link AdminBroOptions}
   */
  findResources({ databases, resources }) {
    this.resources = []
    if (resources && resources.length > 0) {
      this.resources = this.resources.concat(resources.map((m) => {
        if (m.toString() === '[object Object]') {
          const resource = ResourceFactory(m.resource, m.decorator)
          return resource
        }
        return ResourceFactory(m)
      }))
    }
    if (databases && databases.length > 0) {
      const rawResources = DatabasesParser(this.options.databases).reduce((memo, database) => {
        return memo.concat(database.resources())
      }, [])
      const resourcesToAdd = rawResources.map(m => ResourceFactory(m)).filter((m) => {
        // ensure that resource is not there yet
        return !this.resources.find(em => em.id() === m.id())
      })
      this.resources = this.resources.concat(resourcesToAdd)
    }
  }

  /**
   * Returns resource base on its ID
   * @param  {String} resourceId    id of a resource defined under {@link BaseResource#id}
   * @return {BaseResource}         found resource
   */
  findResource(resourceId) {
    return this.resources.find(m => m.id() === resourceId)
  }

  /**
   * Renders an entire login page with email and password fields
   * using {@link Renderer}.
   *
   * @param  {Object} options
   * @param  {String} options.action          login form action url - it could be
   *                                          '/admin/login'
   * @param  {String} [options.errorMessage]  optional error message. When given
   *                                          renderer will print this message in
   *                                          the form
   * @return {String}                         HTML of the rendered page
   */
  static async renderLogin({ action, errorMessage }) {
    return new Renderer('pages/login', { action, errorMessage }).render()
  }
}

/**
 * Base class for all resource decorators
 * @type {BaseDecorator}
 */
AdminBro.BaseDecorator = BaseDecorator


/**
 * List of all supported routes along with controllers
 * @type {Routes}
 */
AdminBro.Routes = Routes

/**
 * BaseResource
 * @type {BaseResource}
 */
AdminBro.BaseResource = BaseResource

/**
 * BaseDatabase
 * @type {BaseDatabase}
 */
AdminBro.BaseDatabase = BaseDatabase

/**
 * BaseRecord
 * @type {BaseRecord}
 */
AdminBro.BaseRecord = BaseRecord

/**
 * BaseProperty
 * @type {BaseProperty}
 */
AdminBro.BaseProperty = BaseProperty

/**
 * ValidationError
 * @type {ValidationError}
 */
AdminBro.ValidationError = ValidationError


module.exports = AdminBro
