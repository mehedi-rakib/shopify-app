import { FormLayout, TextField, Text, Box, Card, LegacyStack, Checkbox, Link, Button, Icon, Tooltip, Modal } from "@shopify/polaris";
import {
	ViewIcon, ClipboardIcon, RefreshIcon
} from '@shopify/polaris-icons';
import { useState } from "react";

function MessageBox({ status, message, show }) {
	if (!status || !show) return null;
	return (
		<Box padding="4 0">
			<Text color={status === "success" ? "success" : "critical"}>{message}</Text>
		</Box>
	);
}

function CheckboxGroup({ formValues, handleChange }) {
	return (
		<LegacyStack vertical spacing="tight">
			<Checkbox
				name="orderManage"
				label="Order Manage by Azan Wholesales"
				checked={formValues.orderManage}
				onChange={(checked) => handleChange(checked, 'orderManage')}
			/>
			<Checkbox
				name="fullOrderManage"
				label="Full Order Management from Azan"
				helpText="Enable this option if you want Azan to handle complete order management including shipping and tracking."
				checked={formValues.fullOrderManage}
				onChange={(checked) => handleChange(checked, 'fullOrderManage')}
			/>
			<Checkbox
				name="productsManagement"
				label="Products Management"
				checked={formValues.productsManagement}
				onChange={(checked) => handleChange(checked, 'productsManagement')}
			/>
			<Checkbox
				name="sandboxManage"
				label="Sandbox Mode"
				checked={formValues.sandboxManage}
				onChange={(checked) => handleChange(checked, 'sandboxManage')}
			/>
			<Checkbox
				name="debugManagement"
				label="Debug Management"
				checked={formValues.debugManagement}
				onChange={(checked) => handleChange(checked, 'debugManagement')}
			/>
		</LegacyStack>
	);
}

export default function ApiConfigurationForm({
	formValues,
	errors,
	handleChange,
	handleSubmit,
	actionData,
	showMessage
}) {
	const [showWarning, setShowWarning] = useState(false);
	const [copied, setCopied] = useState(false);
	const [showToken, setShowToken] = useState(false);

	const handleCopyToken = () => {
		navigator.clipboard.writeText(formValues.authToken);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000); // Hide after 2 seconds
	};

	const handleGenerateToken = async () => {
		const res = await fetch("/api/generate-token", { method: "POST" });
		const data = await res.json();
		if (data.token) {
			handleChange(data.token, "authToken");
		} else {
			console.error("Failed to generate token:", data.error);
		}
		setShowWarning(false);
	};

	return (
		<Card>
			<Box padding="4">
				<form method="post" onSubmit={handleSubmit}>
					<FormLayout>
						<Text variant="headingMd" as="h2">API Settings</Text>

						<TextField
							name="appId"
							label="APP ID"
							value={formValues.appId}
							onChange={(value) => handleChange(value, 'appId')}
							autoComplete="off"
							error={errors.appId}
						/>


						<TextField
							name="secretKey"
							label="Secret Key"
							value={formValues.secretKey}
							onChange={(value) => handleChange(value, 'secretKey')}
							type="text"
							autoComplete="off"
							error={errors.secretKey}
						/>
						<Box position="relative">
							<TextField
								name="authToken"
								label="Auth Token"
								value={formValues.authToken}
								onChange={(value) => handleChange(value, 'authToken')}
								type={showToken ? "text" : "password"}
								autoComplete="off"
								readOnly
								error={errors.authToken}
								style={{ paddingRight: 80 }} // Add space for icons
							/>
							{copied && (
								<Box padding="2 0 0 0">
									<Text color="success" variant="bodySm">
										Token copied!
									</Text>
								</Box>
							)}
						</Box>
						<Box
							position="absolute"
							top="50%"
							right="12px"
							style={{
								transform: "translateY(-50%)",
								display: "flex",
								gap: "8px",
								alignItems: "center",
								height: "100%",
								pointerEvents: "auto",
							}}
						>
							<Tooltip content={showToken ? "Hide Token" : "Show Token"}>
								<span
									style={{ cursor: "pointer", display: "inline-flex" }}
									onClick={() => setShowToken((prev) => !prev)}
								>
									<Icon source={ViewIcon} tone="base" />
								</span>
							</Tooltip>
							<Tooltip content="Copy Token">
								<span
									style={{ cursor: "pointer", display: "inline-flex" }}
									onClick={handleCopyToken}
								>
									<Icon source={ClipboardIcon} tone="base" />
								</span>
							</Tooltip>
							<Tooltip content="Refresh Token">
								<span
									style={{ cursor: "pointer", display: "inline-flex" }}
									onClick={() => setShowWarning(true)}
								>
									<Icon source={RefreshIcon} tone="base" />
								</span>
							</Tooltip>
						</Box>
						{/* Warning Modal */}
						<Modal
							open={showWarning}
							onClose={() => setShowWarning(false)}
							title="Generate New Token"
							primaryAction={{
								content: "Generate",
								destructive: true,
								onAction: handleGenerateToken,
							}}
							secondaryActions={[
								{
									content: "Cancel",
									onAction: () => setShowWarning(false),
								},
							]}
						>
							<Modal.Section>
								<Text color="critical">
									Warning: Generating a new token will replace your current token. 
									Make sure you update your integrations with the new token.
								</Text>
							</Modal.Section>
						</Modal>
						
						<CheckboxGroup formValues={formValues} handleChange={handleChange} />

						<MessageBox status={actionData?.status} message={actionData?.message} show={showMessage} />

						<Link url="https://azanwholesale.com/register" target="_blank">
							Get App Id & Secret Key
						</Link>

						<Box padding="4 0 0 0">
							<Button submit primary>Save Change</Button>
						</Box>
					</FormLayout>
				</form>
			</Box>
		</Card>
	);
}
