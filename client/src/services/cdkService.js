import api from './api'
import i18n from '../i18n/config'

class CdkService {
  /**
   * Redeem a CDK code
   * @param {string} code - The CDK code to redeem
   * @param {string} username - Username of the user redeeming the CDK
   * @returns {Promise<Object>} Redemption result
   */
  async redeemCdk(code, username) {
    try {
      const response = await api.post('/cdks/redeem', {
        code,
        username
      })
      
      return response.data
    } catch (error) {
      console.error('CDK redemption error:', error)
      
      // Extract error message
      let errorMessage = i18n.t('messages.serverError')
      if (error.response && error.response.data) {
        if (error.response.data.message) {
          errorMessage = error.response.data.message
        }
      }
      
      throw new Error(errorMessage)
    }
  }

  /**
   * Validate a CDK code without redeeming
   * @param {string} code - The CDK code to validate
   * @returns {Promise<Object>} Validation result
   */
  async validateCdk(code) {
    try {
      const response = await api.post('/cdks/validate', {
        code
      })
      
      return response.data
    } catch (error) {
      console.error('CDK validation error:', error)
      
      // Extract error message
      let errorMessage = i18n.t('messages.serverError')
      if (error.response && error.response.data) {
        if (error.response.data.message) {
          errorMessage = error.response.data.message
        }
      }
      
      throw new Error(errorMessage)
    }
  }

  /**
   * Validate CDK format
   * @param {string} code - The CDK code to validate
   * @returns {boolean} True if format is valid
   */
  validateCdkFormat(code) {
    if (!code) return false
    const cdkRegex = /^[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}$/
    return cdkRegex.test(code)
  }
}

export default new CdkService()