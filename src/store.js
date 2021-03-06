export default function store (state, emitter) {
  state.input = ''
  state.items = {
    entities: {},
    result: []
  }

  constructor()

  function constructor() {
    chrome.downloads.search({
      orderBy: ['-startTime'],
      limit: 0
    }, items => emitter.emit('cdqe:bootstrap', items))

    chrome.downloads.onCreated.addListener(item => emitter.emit('cdqe:add', item, { echo: false }))
    chrome.downloads.onChanged.addListener(delta => emitter.emit('cdqe:alter', delta, { echo: false }))
    chrome.downloads.onErased.addListener(id => emitter.emit('cdqe:remove', id, { echo: false }))

    // `chrome.downloads.onChanged` don't emit event for bytesReceived and estimatedEndTime change
    setInterval(() => {
      chrome.downloads.search({
        state: 'in_progress',
        paused: false,
        limit: 0
      }, items => items.length ? emitter.emit('cdqe:refresh', items) : null)
    }, 1000)
  }

  emitter.on('cdqe:bootstrap', items => {
    state.items.entities = items.map(decorate).reduce((obj, item) => Object.assign(obj, { [item.id]: item }), {})
    state.items.result = [].concat(items.map(items => items.id))
    items.forEach(item => emitter.emit('cdqe:dress', item.id))
    emitter.emit('render')
  })

  emitter.on('cdqe:input', value => {
    state.input = value
    emitter.emit('render')
  })

  emitter.on('cdqe:add', item => {
    state.items.entities[item.id] = decorate(item)
    state.items.result = [item.id].concat(state.items.result)
    emitter.emit('cdqe:dress', item.id)
    emitter.emit('render')
  })

  emitter.on('cdqe:refresh', items => {
    emitter.emit('cdqe:alter', items
      .filter(item => state.items.result.includes(item.id))
      .map(item => Object.keys(item)
        .filter(key => item[key] !== state.items.entities[item.id][key])
        .reduce((obj, key) => Object.assign(obj, {
          [key]: {
            previous: state.items.entities[item.id][key],
            current: item[key]
          }
        }), { id: item.id })
      ))
  })

  emitter.on('cdqe:dress', id => {
    chrome.downloads.getFileIcon(id, { size: 32 }, icon => emitter.emit('cdqe:alter', {
      id: id,
      icon: {
        previous: null,
        current: icon
      }
    }))
  })

  emitter.on('cdqe:alter', deltas => {
    (Array.isArray(deltas) ? deltas : [deltas])
      .filter(delta => state.items.result.includes(delta.id))
      .map(carve)
      .forEach(chunk => {
        const item = state.items.entities[chunk.id]
        const estimatedEndTime = !chunk.estimatedEndTime ? {} : { estimatedRemainingTime: new Date(chunk.estimatedEndTime) - new Date() }
        const current = (chunk.bytesReceived || item.bytesReceived) - item.bytesReceived
        const speed = !current ? {} : {
          speed: item.records.concat(current).slice(1).slice(-10).reduce((total, value) => total + value, 0) / Math.min(item.records.length, 10),
          records: item.records.concat(current)
        }

        state.items.entities[chunk.id] = Object.assign(item, chunk, estimatedEndTime, speed)
      })

    emitter.emit('render')
  })

  emitter.on('cdqe:stop', id => {
    chrome.downloads.cancel(id)
  })

  emitter.on('cdqe:pause', id => {
    chrome.downloads.pause(id)
  })

  emitter.on('cdqe:resume', id => {
    chrome.downloads.resume(id)
  })

  emitter.on('cdqe:show', id => {
    chrome.downloads.show(id)
  })

  emitter.on('cdqe:open', id => {
    chrome.downloads.open(id)
  })

  emitter.on('cdqe:remove', (id, opts = {}) => {
    if (opts.echo !== false) {
      const name = (state.items.entities[id].filename || state.items.entities[id].url || '#' + id).split('/').pop()
      chrome.downloads.erase({ id: id }, results => results.includes(id) ? null : console.warn('cdqe:error', `Unable to erase download ${name}`))
    }

    state.items.result = state.items.result.filter(value => value !== id)
    delete state.items.entities[id]
    emitter.emit('render')
  })

  emitter.on('cdqe:clear', () => {
    chrome.downloads.erase({ query: [''] }, results => {
      state.items.result = state.items.result.filter(id => {
        if (results.includes(id)) {
          delete state.items.entities[id]
          return false
        } else {
          console.warn('cdqe:error', `Unable to erase download #${id}`)
          return true
        }
      })
    })
    emitter.emit('render')
  })
}

function decorate (item) {
  return Object.assign(item, {
    records: item.records ? item.records : []
  })
}

function carve (delta) {
  return Object.keys(delta)
    .reduce((obj, key) => Object.assign(obj, { [key]: typeof delta[key] === 'object' ? delta[key].current : delta[key] }), {})
}
