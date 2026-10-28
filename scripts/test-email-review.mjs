import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { JSDOM, VirtualConsole } from 'jsdom'

const galleryUrl = new URL('../docs/outreach/email-templates.html', import.meta.url)

test('the old shell address leads to the generated gallery, including a manual fallback', () => {
  const entryUrl = new URL('./email-review-shell.html', import.meta.url)
  const entry = new JSDOM(readFileSync(entryUrl, 'utf8'), { url: entryUrl.href })
  try {
    const document = entry.window.document
    const refresh = document.querySelector('meta[http-equiv="refresh"]').content
    const destination = new URL(refresh.split('url=')[1], entryUrl)
    assert.equal(destination.href, galleryUrl.href)
    assert.equal(document.querySelector('a').href, galleryUrl.href)
    const gallery = new JSDOM(readFileSync(destination, 'utf8'))
    try {
      const data = JSON.parse(gallery.window.document.getElementById('email-data').textContent)
      assert.equal(data.catalog.length, 21)
      assert.ok(data.catalog.some(email => email.id === 'participant-welcome'))
      assert.ok(data.catalog.some(email => email.id === 'contributor-welcome'))
    } finally {
      gallery.window.close()
    }
  } finally {
    entry.window.close()
  }
})

test('opening the generated file initializes the directory and all 21 preview bodies', () => {
  const errors = []
  const virtualConsole = new VirtualConsole()
  virtualConsole.on('jsdomError', error => errors.push(error.message))
  const gallery = new JSDOM(readFileSync(galleryUrl, 'utf8'), {
    url: galleryUrl.href,
    runScripts: 'dangerously',
    virtualConsole,
    beforeParse(window) {
      window.ResizeObserver = class { observe() {} disconnect() {} }
      window.requestAnimationFrame = callback => callback()
    },
  })
  try {
    const { document, Event } = gallery.window
    const get = id => document.getElementById(id)
    assert.equal(get('total').textContent, '21')
    assert.equal(get('template-title').textContent, 'Community Welcome')
    const buttons = [...document.querySelectorAll('.template-button')]
    assert.equal(buttons.length, 21)
    for (const button of buttons) {
      button.click()
      assert.equal(get('template-title').textContent, button.textContent)
      assert.ok(get('subject').textContent.trim())
      // jsdom does not render iframe srcdoc; inspect the selected HTML separately.
      const preview = new JSDOM(get('preview').srcdoc)
      try {
        assert.ok(preview.window.document.body.textContent.trim().length > 30)
        for (const image of preview.window.document.images) assert.ok(image.src.startsWith('data:image/'))
      } finally {
        preview.window.close()
      }
    }
    get('search').value = 'Welcome'
    get('search').dispatchEvent(new Event('input'))
    assert.equal(document.querySelectorAll('.template-button').length, 2)
    document.querySelector('[data-id="contributor-welcome"]').click()
    assert.equal(get('status').textContent, '待 Slack API 接入')
    get('mobile').click()
    assert.equal(get('mobile').getAttribute('aria-pressed'), 'true')
    assert.ok(get('frame-wrap').classList.contains('mobile'))
    assert.deepEqual(errors, [])
  } finally {
    gallery.window.close()
  }
})
