const dotenv = require('dotenv')
dotenv.config()
const { Reshuffle } = require('reshuffle')
const {
  WixConnector,
  parseFilter,
  wrapDates,
  unwrapDates
} = require('reshuffle-wix-connector')

const { HIKE_SCHEMA } = require('./data/schema')
const { PgsqlConnector } = require('reshuffle-pgsql-connector')

const COLLECTION = process.env.TABLE_NAME || 'hike'

const app = new Reshuffle()

const wix = new WixConnector(app, {
  secret: process.env.WIX_SECRET || 'tunnel'
})

// This will throw an error if url is not defined.
const pg = new PgsqlConnector(app, {
  url: process.env.WIX_DB_URL
})

wix.on(
  { action: 'provision' },
  async (event, app) => {
    event.response.sendStatus(200)
  }
)

wix.on({ action: 'schemas/find' },
  async (event, app) => {
    if (event.request.body.schemaIds.includes(COLLECTION)) {
      event.response.status(200).json(HIKE_SCHEMA)
    } else {
      event.response.status(404).json({ 'message': 'No hike schema found' })
    }
  }
)

wix.on({ action: 'schemas/list' },
  async (event, app) => {
    event.response.status(200).json(HIKE_SCHEMA)
  }
)

wix.on({ action: 'data/get' },
  async (event, app) => {
    const { collectionName, itemId } = event.request.body
    if (collectionName === COLLECTION) {
      const res = await pg.query(`SELECT * from ${COLLECTION} where _id = '${itemId}';`)
      if (res.rowCount === 1)
        event.response.status(200).json({ item: wrapDates(convertItem(res.rows[0])) })
      else
        event.response.status(404).json({ 'message': `Hike with id ${itemId} not found` })
    } else {
      event.response.status(400).json({ 'message': 'Bad request. We only have hikes' })
    }
  }
)

wix.on({ action: 'data/count' },
  async (event, app) => {
    const { collectionName, filter } = event.request.body
    if (collectionName === COLLECTION) {
      const _filter = parseFilter(filter)
      const hikes = await pg.query(`SELECT * from ${COLLECTION} ${_filter}`)
      event.response.status(200).json({ totalCount: hikes.rowCount })
    } else {
      event.response.status(400).json({ 'message': 'Bad request. We only have hikes' })
    }
  }
)

wix.on({ action: 'data/find' },
  async (event, app) => {
    const { collectionName, sort, filter, limit, skip } = event
    const _filter = parseFilter(filter)
    if (collectionName === COLLECTION) {
      const _limit = limit ? `LIMIT ${limit}` : ''
      const _skip = skip ? `OFFSET ${skip}` : ''
      const _sort = sort ? `ORDER BY ${sort[0].fieldName} ${sort[0].direction}` : ''
      const hikes = await pg.query(`SELECT * from ${COLLECTION} ${_filter} ${_sort} ${_limit} ${_skip}`)
      const items = hikes.rows.map(hike => wrapDates(convertItem(hike)))
      event.response.status(200).json({ items, totalCount: hikes.rowCount })
    } else {
      event.response.status(400).json({ 'message': 'Bad request. We only have hikes' })
    }
  }
)

wix.on({ action: 'data/insert' },
  async (event, app) => {
    const { collectionName, item } = event.request.body
    if (!item || !item._id) {
      event.response.status(400).json({ 'message': `Bad request` })
    }

    if (collectionName === COLLECTION) {
      const exist = await pg.query(`SELECT from ${COLLECTION} where _id = '${item._id}';`)
      if (exist.rowCount === 0) {
        const cols = Object.keys(item).filter(i => hikeFields().includes(i))
        const values = Object.keys(unwrapDates(item)).filter(i => hikeFields().includes(i))
        .map(k => getValue(item, k))

        await pg.query(`INSERT INTO ${COLLECTION} (${cols.join(', ')}) VALUES (${values.join(', ')});`)
        event.response.status(200).json({ item: wrapDates(item) })
      } else {
        event.response.status(409).json({ 'message': `item with id=${item._id} exists` })
      }
    } else {
      event.response.status(400).json({ 'message': 'Bad request. We only have hikes' })
    }
  }
)

wix.on({ action: 'data/update' },
  async (event, app) => {
    const { collectionName, item } = event.request.body
    if (!item || !item._id) {
      event.response.status(400).json({ 'message': `Bad request` })
    }
    if (collectionName === COLLECTION) {
      const exist = await pg.query(`SELECT from ${COLLECTION} where _id = '${item._id}';`)
      if (exist.rowCount === 1) {
        const res = await pg.query(`UPDATE ${COLLECTION} set ${createUpdateSQL(item)} where _id = '${item._id}';`)
        if (res.rowCount === 1) {
          event.response.status(200).json({ item: wrapDates(convertItem(item)) })
        } else
          event.response.status(409).json({ 'message': `Failed to update` })
      }
    } else {
      event.response.status(400).json({ 'message': 'Bad request. We only have hikes' })
    }
  }
)

wix.on({ action: 'data/remove' },
  async (event, app) => {
    const { collectionName, itemId } = event.request.body
    if (!itemId) {
      event.response.status(400).json({ 'message': `Bad request` })
    }
    if (collectionName === COLLECTION) {
      const exist = await pg.query(`SELECT from ${COLLECTION} where _id = '${itemId}';`)
      if (exist.rowCount === 1) {
        await pg.query(`DELETE FROM ${COLLECTION} where _id = '${itemId}';`)
        if (res.rowCount === 1) {
          event.response.status(200).json({ item: wrapDates(convertItem(exist.rows[0])) })
        } else
          event.response.status(409).json({ 'message': `Failed to delete` })
      } else {
        event.response.status(404).json({ 'message': `Item not found` })

      }
    } else {
      event.response.status(400).json({ 'message': 'Bad request. We only have hikes' })
    }
  }
)

const hikeFields = () => Object.keys(HIKE_SCHEMA.schemas.find(s => s.displayName === COLLECTION).fields)

const createUpdateSQL = (item) => {
  const fieldsInSchema = hikeFields()
  delete fieldsInSchema._id
  return Object.keys(item)
  .filter(i => fieldsInSchema.includes(i))
  .map(k => `${k} = ${getValue(item, k)}`)
  .join(', ')
}

// Convert the item to the format Wix expects for number and date fields
const convertItem = (item) => {
  if (item.distance) {
    item.distance = Number(item.distance)
  }
  if (item.completed_date) {
    item.completed_date = new Date(item.completed_date)
  }
  return item
}

const getValue = (item, k) => {
  switch (HIKE_SCHEMA.schemas.find(s => s.displayName === COLLECTION).fields[k].type) {
    case 'datetime':
      return item[k] === null ? null : `'${item[k]}'`
    case 'text':
      return `'${item[k]}'`
    case 'number':
      return Number(item[k])
  }
}

app.start()
