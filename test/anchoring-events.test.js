/* eslint-env node, mocha */
/* eslint-disable no-unused-expressions */

const { mock, expect, sinon, exonumAnchoring } = require('./constants').module
const { getTxs, cfg1 } = require('./mocks/')
const _ = require('../src/common/private').default

const token = 'token'
const network = 'BTC'
const provider = 'http://node.com'
const provWithPort = `${provider}:8000`
const blockTrailAPI = 'https://api.blocktrail.com'
const config = {
  cache: false,
  driver: new exonumAnchoring.drivers.Blocktrail({ token, network }),
  provider: { nodes: [provider] }
}

describe('Events', function () {
  beforeEach(() => {
    mock.onGet(`${provWithPort}/api/services/configuration/v1/configs/committed`)
      .replyOnce(200, cfg1)
  })

  it('loaded and synchronized events', d => {
    const anchoring = new exonumAnchoring.Anchoring(config)
    const loaded = sinon.spy()
    const synchronized = sinon.spy()
    const count = 4

    anchoring.on('loaded', loaded)
    anchoring.on('synchronized', synchronized)

    for (let i = 1; i <= count; i++) {
      mock.onGet(`${blockTrailAPI}/v1/${network}/address/2NCtE6CcPiZD2fWHfk24G5UH5YNyoixxEu6/transactions`, {
        params: { api_key: token, limit: 200, page: i, sort_dir: 'asc' }
      }).replyOnce(200, getTxs(i === count ? 199 : 200, i))
    }

    anchoring.on('synchronized', e => {
      expect(loaded.callCount).to.equal(count)
      expect(synchronized.callCount).to.equal(1)
      expect(loaded.args).to.deep.equal([[198000], [398000], [598000], [794000]])
      expect(synchronized.args[0][0]).to.equal(loaded.args[3][0])
      d()
    })
  })

  it('adding and removing', () => {
    const anchoring = new exonumAnchoring.Anchoring(config)
    const loaded = e => e

    anchoring.on('loaded', loaded)
    expect(_(anchoring).events.loaded.length).to.equal(1)

    expect(anchoring.off('loaded', e => e)).to.equal(false)
    expect(_(anchoring).events.loaded.length).to.equal(1)

    expect(anchoring.off('loaded', loaded)).to.equal(true)
    expect(_(anchoring).events.loaded.length).to.equal(0)

    expect(anchoring.off('loaded', loaded)).to.equal(false)
  })
})