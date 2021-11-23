import "../css/main.less";
import "../css/styles.css";
import React from "react";
import ReactDOM from "react-dom";
import { version } from "../../package.json";

import "babel-polyfill";

class CheckboxApp extends React.Component {
  constructor(props) {
    super(props);
    console.log("Checkbox app, version ", version);

    // state
    this.state = {
      device: null,
    };
  }

  initDevice = async () => {
    const devices = await Poster.devices.getAll({ type: "fiscalPrinter" });
    let device;
    if (devices) {
      console.log("Checkbox devices", devices);
      device = devices[0];
    } else {
      // create new
      device = await Poster.devices.create({
        deviceClass: "platformOnlineFiscal",
      });
    }
    device.setOnline();
    device.setDefault();

    const funcs = Object.getOwnPropertyNames(device).filter(
      (item) => typeof device[item] === "function" && item.startsWith("on")
    );

    device.onPrintFiscalReceipt((event) => {
      console.log("onPrintFiscalReceipt", event);
    });
    device.onPrintNonFiscal((event) => {
      console.log("onPrintNonFiscal", event);
    });
    device.onPrintCashFlow((event) => {
      console.log("onPrintCashFlow", event);
    });

    device.onPrintXReport((event) => {
      console.log("onPrintXReport", event, next);
    });

    device.onPrintXReport2((event, next) => {
      console.log("onPrintXReport", event, next);
      next()
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
    const { order, paymentPlace } = data;
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
    Poster.interface.popup({
      width: 500,
      height: 400,
      title: `Checkbox application (${version})`,
    });
  };

  refresh = async () => {
    await this.initDevice();
  };

  render() {
    const { device } = this.state;
    return (
      <div className="checkbox-app">
        {device && <p>Фискальный принтер: {device.id}</p>}
        <button onClick={this.refresh} className="btn-green btn-device">
          Перечитать
        </button>
      </div>
    );
  }
}

ReactDOM.render(<CheckboxApp />, document.getElementById("app-container"));
