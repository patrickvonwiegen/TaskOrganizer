"""Config flow for TaskOrganizer."""

from typing import Any
import voluptuous as vol

from homeassistant import config_entries
from homeassistant.core import callback
from homeassistant.data_entry_flow import FlowResult

from .const import (
    DOMAIN,
    DEFAULT_COLOR_DONE,
    DEFAULT_COLOR_DUE,
    DEFAULT_COLOR_OVERDUE,
    DEFAULT_OVERDUE_DAYS,
)


class TaskOrganizerConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Handle a config flow for the TaskOrganizer integration."""
    
    VERSION = 1

    async def async_step_user(self, user_input: dict[str, Any] | None = None) -> FlowResult:
        """
        Handle the initial step of the setup process.
        Only one single instance of TaskOrganizer is allowed.
        """
        if self._async_current_entries():
            return self.async_abort(reason="single_instance_allowed")

        if user_input is not None:
            return self.async_create_entry(title="TaskOrganizer", data=user_input)

        return self.async_show_form(
            step_id="user", 
            data_schema=vol.Schema({}), 
            errors={}
        )

    @staticmethod
    @callback
    def async_get_options_flow(config_entry: config_entries.ConfigEntry) -> config_entries.OptionsFlow:
        """Create the options flow."""
        return TaskOrganizerOptionsFlowHandler()


class TaskOrganizerOptionsFlowHandler(config_entries.OptionsFlow):
    """Handle options flow for TaskOrganizer."""

    async def async_step_init(self, user_input: dict[str, Any] | None = None) -> FlowResult:
        """Manage the options."""
        if user_input is not None:
            return self.async_create_entry(title="", data=user_input)

        options = self.config_entry.options
        data_schema = vol.Schema({
            vol.Optional("overdue_days", default=options.get("overdue_days", DEFAULT_OVERDUE_DAYS)): int,
            vol.Optional("color_done", default=options.get("color_done", DEFAULT_COLOR_DONE)): str,
            vol.Optional("color_due", default=options.get("color_due", DEFAULT_COLOR_DUE)): str,
            vol.Optional("color_overdue", default=options.get("color_overdue", DEFAULT_COLOR_OVERDUE)): str,
        })

        return self.async_show_form(step_id="init", data_schema=data_schema)