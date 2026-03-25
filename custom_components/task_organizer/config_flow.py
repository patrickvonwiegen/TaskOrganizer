"""Config flow for TaskOrganizer."""

from typing import Any
import voluptuous as vol

from homeassistant import config_entries
from homeassistant.data_entry_flow import FlowResult

from .const import DOMAIN


class TaskOrganizerConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Handle a config flow for the TaskOrganizer integration."""
    
    VERSION = 1

    async def async_step_user(self, user_input: dict[str, Any] | None = None) -> FlowResult:
        """
        Handle the initial step of the setup process.
        Only one single instance of TaskOrganizer is allowed.
        
        :param user_input: Input given by the user during setup.
        :return: FlowResult indicating success or abortion.
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