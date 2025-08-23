import { json } from "@remix-run/node";
import { useActionData, useSubmit, useLoaderData } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { useState, useEffect } from "react";
import { Layout, Page } from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import ApiConfigurationForm from "../component/ApiConfigurationForm";

export async function loader({ request }) {
  const { admin, session } = await authenticate.admin(request);

  // Get existing configuration
  const config = await db.configuration.findUnique({
    where: { shopId: session.shop }
  });

  return json({
    config,
    shop: session.shop
  });
}

export async function action({ request }) {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();

  try {
    await db.configuration.upsert({
      where: { shopId: session.shop },
      update: {
        appId: formData.get("appId"),
        secretKey: formData.get("secretKey"),
        authToken: formData.get("authToken"),
        orderManage: formData.get("orderManage") === "true",
        sandboxManage: formData.get("sandboxManage") === "true",
        fullOrderManage: formData.get("fullOrderManage") === "true",
        productsManagement: formData.get("productsManagement") === "true",
        debugManagement: formData.get("debugManagement") === "true",
      },
      create: {
        shopId: session.shop,
        appId: formData.get("appId"),
        secretKey: formData.get("secretKey"),
        authToken: formData.get("authToken"),
        orderManage: formData.get("orderManage") === "true",
        sandboxManage: formData.get("sandboxManage") === "true",
        fullOrderManage: formData.get("fullOrderManage") === "true",
        productsManagement: formData.get("productsManagement") === "true",
        debugManagement: formData.get("debugManagement") === "true",
      },
    });

    return json({
      status: "success",
      message: "Configuration saved successfully!!!"
    });
  } catch (error) {
    return json({
      status: "error",
      message: "Failed to save configuration!!!"
    }, { status: 500 });
  }
}


// In the component:
export default function ApiConfigurationPage() {
  const { config } = useLoaderData();
  const actionData = useActionData();
  const submit = useSubmit();
  const [showMessage, setShowMessage] = useState(true);

  useEffect(() => {
    if (actionData?.status) {
      setShowMessage(true);
      const timer = setTimeout(() => {
        setShowMessage(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [actionData]);

  const [formValues, setFormValues] = useState({
    appId: config?.appId || "",
    secretKey: config?.secretKey || "",
    authToken: config?.authToken || "",
    orderManage: config?.orderManage || false,
    sandboxManage: config?.sandboxManage || false,
    fullOrderManage: config?.fullOrderManage || false,
    productsManagement: config?.productsManagement || false,
    debugManagement: config?.debugManagement || false,
  });

  const [errors, setErrors] = useState({
    appId: "",
    secretKey: ""
  });

  const validateField = (name, value) => {
    if (name === 'appId' || name === 'secretKey') {
      let error = "";
      if (!value.trim()) {
        error = `${name === 'appId' ? 'APP ID' : 'Secret Key'} is required`;
      }
      setErrors(prev => ({ ...prev, [name]: error }));
      return error === "";
    }
    return true;
  };

  const handleChange = (value, name) => {
    setFormValues(prev => ({ ...prev, [name]: value }));
    validateField(name, value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const isAppIdValid = validateField('appId', formValues.appId);
    const isSecretKeyValid = validateField('secretKey', formValues.secretKey);
    if (!isAppIdValid || !isSecretKeyValid) {
      return;
    }
    const formData = new FormData(e.target);
    formData.set("orderManage", formValues.orderManage.toString());
    formData.set("sandboxManage", formValues.sandboxManage.toString());
    formData.set("fullOrderManage", formValues.fullOrderManage.toString());
    formData.set("productsManagement", formValues.productsManagement.toString());
    formData.set("debugManagement", formValues.debugManagement.toString());
    submit(formData, { method: "post" });
  };

  return (
    <Page>
      <TitleBar title="API Configuration" />
      <Layout>
        <Layout.Section>
          <ApiConfigurationForm
            formValues={formValues}
            errors={errors}
            handleChange={handleChange}
            handleSubmit={handleSubmit}
            actionData={actionData}
            showMessage={showMessage}
          />
        </Layout.Section>
      </Layout>
    </Page>
  );
}

