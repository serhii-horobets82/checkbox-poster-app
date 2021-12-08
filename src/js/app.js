import "../css/main.less";
import "../css/styles.css";
import React from "react";
import ReactDOM from "react-dom";
import { version } from "../../package.json";

import "babel-polyfill";

const checkboxApiTest = "https://dev-api.checkbox.in.ua";
const checkboxApiProd = "https://api.checkbox.ua";

class CheckboxApp extends React.Component {
  constructor(props) {
    super(props);
    console.log("Checkbox app, version ", version);

    let licenseKey;
    let pinCode;
    const extras = Poster.settings["extras"];
    console.log("Checkbox extras ", extras);
    if (extras) {
      licenseKey = extras["licenseKey"];
      pinCode = extras["pinCode"];
    }

    // state
    this.state = {
      device: null,
      licenseKey: licenseKey,
      pinCode: pinCode,
      isProd: false,
      error: null,
      cashier: null,
    };
  }

  initDevice = async () => {
    const devices = await Poster.devices.getAll({ type: "fiscalPrinter" });
    console.log("devices", devices);
    let device;
    if (devices && devices.length > 0) {
      console.log("Checkbox devices", devices);
      device = devices[0];
    } else {
      // create new
      device = await Poster.devices.create({
        deviceClass: "platformOnlineFiscal",
      });
      console.log("New device", device);
    }
    device.setOnline();
    device.setDefault();

    let dev = await Poster.devices.get(device.id);
    let result = await dev.setExtras("checkbox", {
      licenseKey: "046cbd2be41bfe43245fa4c1",
      pinCode: "9260012519",
    });

    console.log("set extras result", result);

    device.onPrintFiscalReceipt(async (event) => {
      console.log("onPrintFiscalReceipt111", event);
      const { order, device } = event;
      const extras = device.extras["checkbox"];
      // console.log("extras", extras);

      var result = await Poster.orders.setExtras(
        order.id,
        "checkbox",
        JSON.stringify({
          id: "1122",
          fiscalCode: "dddd",
        })
      );

      console.log(result);

      console.log("s", order.id, order.extras);
      const products = [];
      const discount =
        order.subtotal - order.total + (order.platformDiscount || 0);

      for (const i in Object.values(order.products)) {
        const product = await Poster.products.getFullName(order.products[i]);
        const model = await Poster.products.get(product.id);
        // If discount applied to the order we should calculate price with discount
        if (product.promotionPrice !== undefined) {
          product.price = product.promotionPrice;
        }

        // Вычитаем скидку на заказ
        product.price -= (product.price / order.subtotal) * discount;
        product.tax = 0;

        // Here we will calculate total tax value, but product price will be only for 1 item
        // E.g. for 2 donuts price field will contain 1 donut price and tax field will contain whole taxes sum for 2 donuts

        // Calculate Sales Tax
        if (model.taxType === 1 && model.taxValue) {
          product.tax = (product.price * model.taxValue) / 100;
        }

        // Calculate VAT. VAT already included in price so we have to subtract it
        if (model.taxType === 3 && model.taxValue) {
          product.tax =
            product.price - product.price / (1 + model.taxValue / 100);
          product.price -= product.tax;
        }

        // Calculate tax on turnover
        if (model.taxType === 2 && model.taxValue) {
          product.tax = (product.price * model.taxValue) / 100;
          product.price -= product.tax;
        }

        if (product.tax !== undefined) {
          product.tax *= product.count;
          product.taxName = model.taxName;
        }

        products.push(product);
      }

      console.log("products", products);
    });
    device.onPrintNonFiscal((event) => {
      console.log("onPrintNonFiscal", event);
    });
    device.onPrintCashFlow((event) => {
      console.log("onPrintCashFlow", event);
    });

    device.onPrintXReport((event, next) => {
      console.log("onPrintXReport");
      console.log("onPrintXReport", event);
      const { device, data } = event;

      const extras = device.extras["checkbox"];
      console.log("extras", extras);

      Poster.makeRequest(
        "https://dev-api.checkbox.in.ua/api/v1/reports",
        {
          headers: [
            "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiQVBJIiwianRpIjoiODQzOTNiNWQtZDFiZS00NWVjLTllZTItMWMyNzcwZmQwYmNhIiwic3ViIjoiZDliNDk1YmQtNzIyNS00YTNhLTllYTEtOTcxNzM4N2EyYjMyIiwibmJmIjoxNjM3Njk2NTI0LCJpYXQiOjE2Mzc2OTY1MjR9.fjo8Yv3PJrdCg6bZLMCTsvno9R-sRNBwijqS5-yH6_w",
          ],
          method: "post",
          timeout: 10000,
        },
        (answer) => {
          console.log("answer", answer);
          if (answer && Number(answer.status) === 201) {
            console.log(answer.result);
          }
        }
      );
      // let dev = Poster.devices.get(device.id);

      //let dev = await Poster.devices.get(device.id);

      //   next({
      //     errorCode: -1,
      //     errorText: 'Текст ошибки',
      //     success: false,
      // });
      next({
        errorCode: 0,
        success: true,
      });
    });
    device.onPrintZReport((event) => {
      console.log("onPrintZReport", event);
    });
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
    });

    this.setState({ device: device });
  };

  async componentDidMount() {
    await this.initDevice();

    Poster.interface.showApplicationIconAt({
      functions: "Checkbox пРРО",
    });

    console.log("Poster", Poster);
    console.log("Poster", Poster.settings);

    Poster.on("applicationIconClicked", this.onIconClick);
    Poster.on("beforeOrderClose", this.beforeOrderClose);
    Poster.on("afterOrderClose", this.afterOrderClose);
  }

  beforeOrderClose = (data, next) => {
    const { order } = data;
    console.log("beforeOrderClose", data);
    next();
  };

  afterOrderClose = async (data, next) => {
    console.log("afterOrderClose", data);
    const { order } = data;
    const products = [];
    const discount =
      order.subtotal - order.total + (order.platformDiscount || 0);

    for (const i in Object.values(order.products)) {
      const product = await Poster.products.getFullName(order.products[i]);
      const model = await Poster.products.get(product.id);
      console.log("product", product);
      console.log("model", model);
      // If discount applied to the order we should calculate price with discount
      if (product.promotionPrice !== undefined) {
        product.price = product.promotionPrice;
      }

      // Вычитаем скидку на заказ
      product.price -= (product.price / order.subtotal) * discount;
      product.tax = 0;

      // Here we will calculate total tax value, but product price will be only for 1 item
      // E.g. for 2 donuts price field will contain 1 donut price and tax field will contain whole taxes sum for 2 donuts

      // Calculate Sales Tax
      if (model.taxType === 1 && model.taxValue) {
        product.tax = (product.price * model.taxValue) / 100;
      }

      // Calculate VAT. VAT already included in price so we have to subtract it
      if (model.taxType === 3 && model.taxValue) {
        product.tax =
          product.price - product.price / (1 + model.taxValue / 100);
        product.price -= product.tax;
      }

      // Calculate tax on turnover
      if (model.taxType === 2 && model.taxValue) {
        product.tax = (product.price * model.taxValue) / 100;
        product.price -= product.tax;
      }

      if (product.tax !== undefined) {
        product.tax *= product.count;
        product.taxName = model.taxName;
      }

      products.push(product);
    }

    console.log("products", products);
  };

  onIconClick = async () => {
    this.getCashierInfo();
    Poster.interface.popup({
      width: 500,
      height: 400,
      title: `Checkbox app (${version})`,
    });
  };

  refresh = async () => {
    await this.initDevice();
  };

  getApiServer = () => {
    return this.state.isProd ? checkboxApiProd : checkboxApiTest;
  };

  getToken = () => {
    const extras = Poster.settings["extras"];
    return extras["token"];
  };

  getCashierInfo = () => {
    const token = this.getToken();
    if (!token) return;

    Poster.makeRequest(
      `${this.getApiServer()}/api/v1/cashier/me`,
      {
        headers: [`Authorization: Bearer ${token}`],
        method: "get",
      },
      (answer) => {
        if (answer && Number(answer.code) !== 200) {
          const { message } = JSON.parse(answer.result);
          this.setState({ error: message });
          Poster.interface.showNotification({
            title: "Ошибка",
            message: message,
            icon: "https://joinposter.com/upload/apps/icons/posterboss-ios.png",
          });
        } else {
          const data = JSON.parse(answer.result);
          console.log("Cashier info", data);
          this.setState({ cashier: data });
        }
      }
    );
  };

  auth = async (e) => {
    e.preventDefault();
    const { licenseKey, pinCode } = this.state;

    // Auth
    Poster.makeRequest(
      `${this.getApiServer()}/api/v1/cashier/signinPinCode`,
      {
        headers: [`X-License-Key: ${licenseKey}`],
        method: "post",
        processData: false,
        data: JSON.stringify({ pin_code: pinCode }),
      },
      (answer) => {
        console.log("Checkbox response", answer);
        if (answer && Number(answer.code) !== 200) {
          const { message } = JSON.parse(answer.result);
          this.setState({ error: message, cashier: null });
        } else {
          const { access_token } = JSON.parse(answer.result);
          this.setState({ error: null });

          // save global settings
          Poster.makeApiRequest(
            "application.setEntityExtras",
            {
              method: "post",
              data: {
                entity_type: "settings",
                extras: {
                  token: access_token,
                  pinCode: pinCode,
                  licenseKey: licenseKey,
                  api: this.getApiServer(),
                },
              },
            },
            (response) => {
              const extras = Poster.settings["extras"];
              console.log("Checkbox extras ", response, extras);
            }
          );
        }
      }
    );
  };

  toggleApiAddress = () => {
    this.setState({ isProd: !this.state.isProd });
  };

  updateInput = (e) => {
    let { id, value } = e.target;
    this.setState({ [id]: value });
  };

  render() {
    const { error, licenseKey, pinCode, isProd, cashier } = this.state;
    return (
      <form onSubmit={this.auth}>
        {/** using hidden input for IOS 9 input focus and onChange fix **/}
        <input type="hidden" />

        <div className="row">
          <div className="col-xs-3">
            <label style={{ marginTop: 6 }}>Сервер</label>
          </div>
          <div className="col-xs-6">
            <label style={{ marginTop: 6 }}>
              {isProd ? checkboxApiProd : checkboxApiTest}
            </label>
          </div>
          <div className="col-xs-3">
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
            <label htmlFor="code btn btn-default" style={{ marginTop: 10 }}>
              Ліцензія
            </label>
          </div>
          <div className="col-xs-9">
            <div className="input-group-lg">
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
            <label htmlFor="code btn btn-default" style={{ marginTop: 10 }}>
              Пін-код
            </label>
          </div>
          <div className="col-xs-5">
            <div className="input-group-lg">
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
        {cashier && (
          <div className="row">
            <div className="col-xs-3">
              <label style={{ marginTop: 6 }}>Касир</label>
            </div>
            <div className="col-xs-6">
              <label style={{ marginTop: 6 }}>{cashier.full_name}</label>
            </div>
          </div>
        )}

        {Boolean(error) && <span className="error-msg">{error}</span>}
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
    );
  }
}

ReactDOM.render(<CheckboxApp />, document.getElementById("app-container"));
