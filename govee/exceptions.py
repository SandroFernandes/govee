"""Custom exceptions for the Govee API client."""


class GoveeError(Exception):
    """Base exception for all Govee errors."""
    pass


class GoveeAPIError(GoveeError):
    """Exception raised when the API returns an error."""
    
    def __init__(self, message, status_code=None, response=None):
        self.message = message
        self.status_code = status_code
        self.response = response
        super().__init__(self.message)


class GoveeAuthError(GoveeAPIError):
    """Exception raised when authentication fails."""
    pass


class GoveeRateLimitError(GoveeAPIError):
    """Exception raised when rate limit is exceeded."""
    pass
