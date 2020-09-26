const fetch = require('node-fetch')
const { format, compareAsc } = require('date-fns')

const endpoint =
  'https://api.sheety.co/9a19cc691e17a75dcd0a6f68b6d7c2d8/yalePublicCalendar/events'

exports.handler = async (event, context) => {
  try {
    let json = await fetch(endpoint).then((res) => res.json())

    let events = json.events
      .filter((event) => event.approved)
      .map((event) => {
        event.startDatetime = new Date(`${event.date}T${event.startTime}`)
        event.endDatetime = new Date(`${event.date}T${event.endTime}`)
        event.date = format(event.startDatetime, 'EEEE, LLLL d, y')
        event.time = `${format(event.startDatetime, 'h:mma')} – ${format(
          event.endDatetime,
          'h:mma',
        )}`.toLowerCase()
        return event
      })
      .filter((event) => compareAsc(event.endDatetime, Date.now()) > -1)
      .sort((a, b) => compareAsc(a.startDatetime, b.startDatetime))
      .map((event) => {
        const start = format(event.startDatetime, "yyyyMMdd'T'HHmmSS")
        const end = format(event.endDatetime, "yyyyMMdd'T'HHmmSS")
        event.calandarLink = googleCalendarUrl({
          title: event.title,
          start,
          end,
          details: event.location
            ? 'Zoom Link: ' + event.location + ' — ' + event.description
            : event.description,
          ctz: 'America/New_York',
        })
        if (event.location) {
          event.zoomId = getZoomID(event.location)
        } else {
          event.zoomId = null
        }
        return event
      })

    return {
      statusCode: 200,
      body: JSON.stringify(events),
    }
  } catch (err) {
    console.error(err)
    return {
      statusCode: 500,
      body: err.toString(),
    }
  }
}

function clean(obj) {
  return Object.entries(obj).reduce((acc, [key, val]) => {
    return val ? Object.assign(Object.assign({}, acc), { [key]: val }) : acc
  }, {})
}
const datePattern = /^\d{8}(T\d{6}Z?)?$/
/**
 * Generate a Google Calendar event URL
 */
function googleCalendarUrl(args) {
  const { start, end, title, ...rest } = args
  if (start && !end) {
    throw new Error('`end` is required when `start` is provided')
  }
  if (!start && end) {
    throw new Error('`start` is required when `end` is provided')
  }
  if (start && !datePattern.test(start)) {
    throw new Error('`start` is malformed')
  }
  if (end && !datePattern.test(end)) {
    throw new Error('`end` is malformed')
  }
  if (start && end && start.length !== end.length) {
    throw new Error('`start` and `end` should be of the same format')
  }
  const searchParams = Object.assign(
    {
      action: 'TEMPLATE',
      dates: start && end ? `${start}/${end}` : undefined,
      text: title,
    },
    rest,
  )
  const urlSearchParams = new URLSearchParams(clean(searchParams))
  return (
    'https://calendar.google.com/calendar/event?' + urlSearchParams.toString()
  )
}

function getZoomID(url) {
  return new URL(url).pathname.slice(3)
}
