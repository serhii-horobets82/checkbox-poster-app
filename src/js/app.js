import '../css/main.less'
import '../css/styles.css'
import React from 'react'
import ReactDOM from 'react-dom'
import { version } from '../../package.json'

import 'babel-polyfill'

const checkboxApiTest = 'https://dev-api.checkbox.in.ua'
const checkboxApiProd = 'https://api.checkbox.ua'

const defaultHeaders = [
  `X-Client-Name:Poster app`,
  `X-Client-Version:${version}`
]

class CheckboxApp extends React.Component {
  constructor(props) {
    super(props)
    console.log('Checkbox app, version ', version)

    let licenseKey
    let pinCode
    const extras = Poster.settings['extras']
    console.log('Checkbox extras ', extras)
    if (extras) {
      licenseKey = extras['licenseKey']
      pinCode = extras['pinCode']
    }

    // state
    this.state = {
      device: null,
      licenseKey: licenseKey,
      pinCode: pinCode,
      isProd: false,
      error: null,
      cashier: null,
      cashRegister: null,
      reportData: null,
      textPreview: false
    }
  }

  initDevice = async () => {
    const devices = await Poster.devices.getAll({ type: 'fiscalPrinter' })
    console.log('devices', devices)
    let device
    if (devices && devices.length > 0) {
      console.log('Checkbox devices', devices)
      device = devices[0]
    } else {
      // create new
      device = await Poster.devices.create({
        deviceClass: 'platformOnlineFiscal'
      })
    }
    device.setOnline()
    device.setDefault()

    device.onPrintFiscalReceipt(async (event, next) => {
      const { order } = event
      const products = []
      // const discount = order.subtotal - order.total + (order.platformDiscount || 0)

      for (const i in Object.values(order.products)) {
        const product = await Poster.products.getFullName(order.products[i])
        const model = await Poster.products.get(product.id)

        // // If discount applied to the order we should calculate price with discount
        // if (product.promotionPrice !== undefined) {
        //   product.price = product.promotionPrice
        // }
        //
        // // Вычитаем скидку на заказ
        // product.price -= (model.price / order.subtotal) * discount
        // product.tax = 0
        //
        // // Here we will calculate total tax value, but product price will be only for 1 item
        // // E.g. for 2 donuts price field will contain 1 donut price and tax field will contain whole taxes sum for 2 donuts
        //
        // // Calculate Sales Tax
        // if (model.taxType === 1 && model.taxValue) {
        //   product.tax = (product.price * model.taxValue) / 100
        // }
        //
        // // Calculate VAT. VAT already included in price so we have to subtract it
        // if (model.taxType === 3 && model.taxValue) {
        //   product.tax =
        //     product.price - product.price / (1 + model.taxValue / 100)
        //   product.price -= product.tax
        // }
        //
        // // Calculate tax on turnover
        // if (model.taxType === 2 && model.taxValue) {
        //   product.tax = (product.price * model.taxValue) / 100
        //   product.price -= product.tax
        // }
        //
        // if (product.tax !== undefined) {
        //   product.tax *= product.count
        //   product.taxName = model.taxName
        // }

        products.push({
          good: {
            barcode: model.barcode,
            name: product.name,
            code: product.id,
            tax: [model.fiscalProgram],
            price: Math.round(parseFloat(model.price) * 100)
          },
          quantity: Math.round(parseFloat(product.count) * 1000)
        })
      }

      const payments = []
      const payedOther = order.payedCert || order.payedEwallet || order.payedThirdParty

      if (order.payedCard) {
        payments.push({ type: 'CARD', value: 0, label: 'Картка' })
      }

      if (order.payedCash) {
        payments.push({ type: 'CASH', value: Math.round(parseFloat(order.payedCashFull) * 100) })
      }

      if (payedOther) {
        payments.push({ type: 'CASHLESS', value: Math.round(parseFloat(order.payedOther) * 100), label: 'Інше' })
      }

      const payload = {
        cashier_name: this.state.cashier && this.state.cashier.full_name,
        goods: products,
        payments,
        rounding: Boolean(order.roundSum)
      }

      console.log('Receipt payload', payload)

      const token = this.getToken()
      Poster.makeRequest(
        `${this.getApiServer()}/api/v1/receipts/sell`,
        {
          headers: defaultHeaders.concat([`Authorization: Bearer ${token}`]),
          method: 'post',
          data: JSON.stringify(payload)
        },
        (answer) => {
          if (answer && Number(answer.code) !== 201) {
            const { message } = JSON.parse(answer.result)
            this.setState({ error: message })
            Poster.interface.showNotification({
              title: 'Помилка',
              message: message
            })
          } else {
            const data = JSON.parse(answer.result)
            console.log('Receipt data', data)
            this.getReceiptView(data.id)
          }
        }
      )

      next({
        errorCode: 0,
        success: true
      })
    })
    device.onPrintNonFiscal((event) => {
      console.log('onPrintNonFiscal', event)
    })
    device.onPrintCashFlow((event) => {
      console.log('onPrintCashFlow', event)
    })

    device.onPrintXReport(async (event, next) => {
      await this.getXReport()
      next({
        errorCode: 0,
        success: true
      })
    })

    device.onPrintZReport(async (event, next) => {
      await this.getZReport()
      next({
        errorCode: 0,
        success: true
      })
    })
    /*
    device.onPrintPeriodicReport((event) => {
      console.log("onPrintPeriodicReport", event);
    });
    device.onOpenCashDrawer((event) => {
      console.log("onOpenCashDrawer", event);
    });
    device.onCancelReceipt((event) => {
      console.log("onCancelReceipt", event);
    });
    device.onPrintNullReceipt((event) => {
      console.log("onPrintNullReceipt", event);
    });
    device.onPrintInvoice((event) => {
      console.log("onPrintInvoice", event);
    });
    device.onPrintOfdReport((event) => {
      console.log("onPrintOfdReport", event);
    });
    device.onGetOfdStatus((event) => {
      console.log("onGetOfdStatus", event);
    });
    device.onGetDpsInfo((event) => {
      console.log("onGetDpsInfo", event);
    });
    device.onPrintCorrection((event) => {
      console.log("onPrintCorrection", event);
    });
    device.onSetTime((event) => {
      console.log("onSetTime", event);
    });
    device.onGetTime((event) => {
      console.log("onGetTime", event);
    });
    device.onSetDate((event) => {
      console.log("onSetDate", event);
    });
    device.onGetDate((event) => {
      console.log("onGetDate", event);
    });
    device.onSetOfdSettings((event) => {
      console.log("onSetOfdSettings", event);
    });
    device.onGetOfdSettings((event) => {
      console.log("onGetOfdSettings", event);
    });
    device.onIsFiscalBlocked((event) => {
      console.log("onIsFiscalBlocked", event);
    });*/

    this.setState({ device: device })
  }

  async componentDidMount() {
    await this.initDevice()

    Poster.interface.showApplicationIconAt({
      functions: 'Checkbox пРРО'
    })

    Poster.on('applicationIconClicked', this.onIconClick)
    Poster.on('shiftOpen', this.onShiftOpen)
    Poster.on('shiftClose', this.onShiftClose)
  }

  onShiftOpen = () => {
    console.log('Open shift')
    this.openShift()
  }

  onShiftClose = () => {
    console.log('Close shift')
  }

  beforeOrderClose = (data, next) => {
    const { order } = data
    console.log('beforeOrderClose', data)
    next()
  }

  afterOrderClose = async (data, next) => {
    console.log('afterOrderClose', data)
    const { order } = data
    const products = []
    const discount =
      order.subtotal - order.total + (order.platformDiscount || 0)

    for (const i in Object.values(order.products)) {
      const product = await Poster.products.getFullName(order.products[i])
      const model = await Poster.products.get(product.id)
      console.log('product', product)
      console.log('model', model)
      // If discount applied to the order we should calculate price with discount
      if (product.promotionPrice !== undefined) {
        product.price = product.promotionPrice
      }

      // Вычитаем скидку на заказ
      product.price -= (product.price / order.subtotal) * discount
      product.tax = 0

      // Here we will calculate total tax value, but product price will be only for 1 item
      // E.g. for 2 donuts price field will contain 1 donut price and tax field will contain whole taxes sum for 2 donuts

      // Calculate Sales Tax
      if (model.taxType === 1 && model.taxValue) {
        product.tax = (product.price * model.taxValue) / 100
      }

      // Calculate VAT. VAT already included in price so we have to subtract it
      if (model.taxType === 3 && model.taxValue) {
        product.tax =
          product.price - product.price / (1 + model.taxValue / 100)
        product.price -= product.tax
      }

      // Calculate tax on turnover
      if (model.taxType === 2 && model.taxValue) {
        product.tax = (product.price * model.taxValue) / 100
        product.price -= product.tax
      }

      if (product.tax !== undefined) {
        product.tax *= product.count
        product.taxName = model.taxName
      }

      products.push(product)
    }

    console.log('products', products)
  }

  getToken = () => {
    const extras = Poster.settings['extras'] || []
    return extras['token']
  }

  getLicenseKey = () => {
    const extras = Poster.settings['extras'] || []
    return extras['licenseKey']
  }

  onIconClick = async () => {
    this.getCashierInfo()
    this.getCashRegisterInfo()
    this.setState({ reportData: null, textPreview: false })
    Poster.interface.popup({
      width: 600,
      height: 600,
      title: `Checkbox app (${version})`
    })
  }

  refresh = async () => {
    await this.initDevice()
  }

  getApiServer = () => {
    return this.state.isProd ? checkboxApiProd : checkboxApiTest
  }

  getXReport = async () => {
    const token = this.getToken()
    if (!token) return

    Poster.makeRequest(
      `${this.getApiServer()}/api/v1/reports`,
      {
        headers: defaultHeaders.concat([`Authorization: Bearer ${token}`]),
        method: 'post'
      },
      (answer) => {
        if (answer && Number(answer.code) !== 201) {
          const { message } = JSON.parse(answer.result)
          this.setState({ error: message })
          Poster.interface.showNotification({
            title: 'Помилка',
            message: message
          })
        } else {
          const data = JSON.parse(answer.result)
          console.log('X report', data.id)
          this.getReportById(data.id)
        }
      }
    )
  }

  getZReport = async () => {
    const token = this.getToken()
    if (!token) return

    Poster.makeRequest(
      `${this.getApiServer()}/api/v1/shifts/close`,
      {
        headers: defaultHeaders.concat([`Authorization: Bearer ${token}`]),
        method: 'post'
      },
      (answer) => {
        console.log('Z report', answer)
        if (answer && Number(answer.code) !== 202) {
          const { message } = JSON.parse(answer.result)
          this.setState({ error: message })
          Poster.interface.showNotification({
            title: 'Помилка',
            message: message
          })
        } else {
          const data = JSON.parse(answer.result)
          console.log('Z report', data)
          this.getReportById(data.z_report.id)
        }
      }
    )
  }

  openShift = async () => {
    const licenseKey = this.getLicenseKey()
    if (!licenseKey) return
    const token = this.getToken()
    if (!token) return

    Poster.makeRequest(
      `${this.getApiServer()}/api/v1/shifts`,
      {
        headers: defaultHeaders.concat([`X-License-Key: ${licenseKey}`]).concat([`Authorization: Bearer ${token}`]),
        method: 'post'
      },
      (answer) => {
        console.log('Open shift', answer)
        if (answer && Number(answer.code) !== 202) {
          const { message } = JSON.parse(answer.result)
          this.setState({ error: message })
          Poster.interface.showNotification({
            title: 'Помилка',
            message: message
          })
        } else {
          const data = JSON.parse(answer.result)
          console.log('New shift', data)
          this.getReportById(data.report.id)
        }
      }
    )
  }

  getReportById = async (id) => {
    Poster.makeRequest(
      `${this.getApiServer()}/api/v1/reports/${id}/text`,
      {
        headers: defaultHeaders,
        method: 'get'
      },
      (answer) => {
        if (answer && Number(answer.code) !== 200) {
          const { message } = JSON.parse(answer.result)
          this.setState({ error: message })
          Poster.interface.showNotification({
            title: 'Ошибка',
            message: message
          })
        } else {
          console.log('Report data', answer.result)
          this.setState({ reportData: answer.result, textPreview: true })
          Poster.interface.popup({
            width: 400,
            height: 600,
            title: `Друк звіту`
          })
        }
      }
    )
  }

  getReceiptView = async (id) => {
    Poster.makeRequest(
      `${this.getApiServer()}/api/v1/receipts/${id}/text`,
      {
        headers: defaultHeaders,
        method: 'get'
      },
      (answer) => {
        if (answer && Number(answer.code) !== 200) {
          const { message } = JSON.parse(answer.result)
          this.setState({ error: message })
          Poster.interface.showNotification({
            title: 'Ошибка',
            message: message
          })
        } else {
          console.log('Receipt view data', answer)
          this.setState({ reportData: answer.result, textPreview: true })
          Poster.interface.popup({
            width: 400,
            height: 600,
            title: `Друк чеку`
          })
        }
      }
    )
  }

  getCashierInfo = () => {
    const token = this.getToken()
    if (!token) return

    Poster.makeRequest(
      `${this.getApiServer()}/api/v1/cashier/me`,
      {
        headers: defaultHeaders.concat([`Authorization: Bearer ${token}`]),
        method: 'get'
      },
      (answer) => {
        if (answer && Number(answer.code) !== 200) {
          const { message } = JSON.parse(answer.result)
          this.setState({ error: message })
          Poster.interface.showNotification({
            title: 'Ошибка',
            message: message
          })
        } else {
          const data = JSON.parse(answer.result)
          console.log('Cashier info', data)
          this.setState({ cashier: data })
        }
      }
    )
  }

  getCashRegisterInfo = () => {
    const licenseKey = this.getLicenseKey()
    if (!licenseKey) return

    Poster.makeRequest(
      `${this.getApiServer()}/api/v1/cash-registers/info`,
      {
        headers: defaultHeaders.concat([`X-License-Key: ${licenseKey}`]),
        method: 'get'
      },
      (answer) => {
        if (answer && Number(answer.code) !== 200) {
          const { message } = JSON.parse(answer.result)
          this.setState({ error: message })
          Poster.interface.showNotification({
            title: 'Ошибка',
            message: message
          })
        } else {
          const data = JSON.parse(answer.result)
          console.log('Cash register info', data)
          this.setState({ cashRegister: data })
        }
      }
    )
  }

  auth = async (e) => {
    e.preventDefault()
    const { licenseKey, pinCode } = this.state

    // Auth
    Poster.makeRequest(
      `${this.getApiServer()}/api/v1/cashier/signinPinCode`,
      {
        headers: defaultHeaders.concat([`X-License-Key: ${licenseKey}`]),
        method: 'post',
        processData: false,
        data: JSON.stringify({ pin_code: pinCode })
      },
      (answer) => {
        console.log('Checkbox response', answer)
        if (answer && Number(answer.code) !== 200) {
          const { message } = JSON.parse(answer.result)
          this.setState({ error: message, cashier: null })
        } else {
          const { access_token } = JSON.parse(answer.result)
          this.setState({ error: null })

          // save global settings
          Poster.makeApiRequest(
            'application.setEntityExtras',
            {
              method: 'post',
              data: {
                entity_type: 'settings',
                extras: {
                  token: access_token,
                  pinCode: pinCode,
                  licenseKey: licenseKey,
                  api: this.getApiServer()
                }
              }
            },
            (response) => {
              const extras = Poster.settings['extras']
              console.log('Checkbox extras ', response, extras)
              this.getCashierInfo()
            }
          )
        }
      }
    )
  }

  toggleApiAddress = () => {
    this.setState({ isProd: !this.state.isProd })
  }

  updateInput = (e) => {
    let { id, value } = e.target
    this.setState({ [id]: value })
  }

  formatDate = (str) => {
    if (str) {
      return (
        str.substring(8, 10) +
        '/' +
        str.substring(5, 7) +
        '/' +
        str.substring(0, 4)
      )
    }
    return ''
  }

  printReport = async () => {
    let printers = await Poster.devices.getAll({ type: 'printer' })
    if (!printers || printers.length === 0) {
      Poster.interface.showNotification({
        title: 'Помилка',
        message: 'Не знайдено жодного принтеру для друку'
      })
    } else {
      const { reportData } = this.state
      console.log('Print content', reportData, printers)
      let result = await printers[0].printText({ text: reportData })
      console.log('Print result', result)
    }
  }

  render() {
    const {
      error,
      licenseKey,
      pinCode,
      isProd,
      cashier,
      cashRegister,
      textPreview,
      reportData
    } = this.state

    if (textPreview) {
      return (
        <div>
          <pre style={{ maxHeight: 500 }}>{reportData}</pre>

          <div className="footer">
            <div className="row">
              <div className="col-xs-12">
                <button
                  className="btn btn-lg btn-success"
                  onClick={this.printReport}
                >
                  Друкувати
                </button>
              </div>
            </div>
          </div>
        </div>
      )
    }

    return (
      <form onSubmit={this.auth}>
        {/** using hidden input for IOS 9 input focus and onChange fix **/}
        <input type="hidden" />

        <div className="panel panel-info">
          <div className="panel-heading">Налаштування підключення</div>
          <div className="panel-body">
            <div className="row">
              <div className="col-xs-3">
                <label style={{ marginTop: 6 }}>API сервер</label>
              </div>
              <div className="col-xs-7">
                <label style={{ marginTop: 6 }}>
                  {isProd ? checkboxApiProd : checkboxApiTest}
                </label>
              </div>
              <div className="col-xs-2">
                <input
                  type="checkbox"
                  id="apiSwitch"
                  name="apiSwitch"
                  style={{ zoom: 1.7, marginBottom: 6 }}
                  checked={!isProd}
                  onChange={this.toggleApiAddress}
                />
                <label
                  htmlFor="apiSwitch"
                  style={{ marginBottom: 10, marginLeft: 7 }}
                >
                  Тест
                </label>
              </div>
            </div>
            <div className="row">
              <div className="col-xs-3">
                <label htmlFor="code btn btn-default">Ліцензія</label>
              </div>
              <div className="col-xs-9">
                <div>
                  <input
                    className="form-control"
                    type="text"
                    id="licenseKey"
                    onChange={this.updateInput}
                    value={licenseKey}
                  />
                </div>
              </div>
            </div>
            <div className="row">
              <div className="col-xs-3">
                <label htmlFor="code btn btn-default">Пін-код</label>
              </div>
              <div className="col-xs-5">
                <div>
                  <input
                    className="form-control"
                    type="text"
                    placeholder=""
                    id="pinCode"
                    onChange={this.updateInput}
                    value={pinCode}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {cashier && (
          <div className="panel panel-info">
            <div className="panel-heading">Інформація по касі</div>
            <div className="panel-body">
              <div className="row">
                <div className="col-xs-3">
                  <span>Касир</span>
                </div>
                <div className="col-xs-5">
                  <label>{cashier.full_name}</label>
                </div>
                <div className="col-xs-4">
                  <h5>
                    Діє до:{' '}
                    <label>{this.formatDate(cashier.certificate_end)}</label>
                  </h5>
                </div>
              </div>
              <div className="row">
                <div className="col-xs-3">
                  <span>Організація</span>
                </div>
                <div className="col-xs-5">
                  <label>{cashier.organization.title}</label>
                </div>
                <div className="col-xs-4">
                  <h5>
                    ПН: <label>{cashier.organization.tax_number}</label>
                  </h5>
                </div>
              </div>
              {cashRegister && (
                <div className="row">
                  <div className="col-xs-3">
                    <span>пРРО</span>
                  </div>
                  <div className="col-xs-5">
                    <label>{cashRegister.title}</label>
                  </div>
                  <div className="col-xs-4">
                    <h5>
                      ФН: <label>{cashRegister.fiscal_number}</label>
                    </h5>
                  </div>
                </div>
              )}
              {cashRegister && (
                <div className="row">
                  <div className="col-xs-3" />
                  <div className="col-xs-9">
                    <h5>{cashRegister.address}</h5>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {Boolean(error) && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}
        <div className="footer">
          <div className="row">
            <div className="col-xs-12">
              <button className="btn btn-lg btn-success" type="submit">
                Авторизувати
              </button>
            </div>
          </div>
        </div>
      </form>
    )
  }
}

ReactDOM.render(<CheckboxApp />, document.getElementById('app-container'))
