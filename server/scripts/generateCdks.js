const fs = require('fs').promises;
const path = require('path');

/**
 * Generate CDK codes with specified quantity and amount
 * Usage: node server/scripts/generateCdks.js --amount=100 --count=5 --currency=USD --expiry=365
 */
class CdkGenerator {
  constructor() {
    this.cdksFilePath = path.join(__dirname, '..', 'data', 'cdks.json');
  }

  /**
   * Parse command line arguments
   */
  parseArgs() {
    const args = process.argv.slice(2);
    const options = {
      amount: 100,       // Default amount
      count: 1,          // Default count
      currency: 'USD',   // Default currency
      expiry: 365        // Default expiry days
    };

    args.forEach(arg => {
      if (arg.startsWith('--amount=')) {
        options.amount = parseFloat(arg.split('=')[1]);
      } else if (arg.startsWith('--count=')) {
        options.count = parseInt(arg.split('=')[1], 10);
      } else if (arg.startsWith('--currency=')) {
        options.currency = arg.split('=')[1];
      } else if (arg.startsWith('--expiry=')) {
        options.expiry = parseInt(arg.split('=')[1], 10);
      }
    });

    return options;
  }

  /**
   * Generate random CDK code
   * Format: XXXX-XXXX-XXXX-XXXX-XXXX-XXXX
   */
  generateCdkKey() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let key = '';
    
    // Generate 6 groups of 4 characters, separated by hyphens  
    for (let i = 0; i < 6; i++) {
      let group = '';
      for (let j = 0; j < 4; j++) {
        group += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      key += group;
      if (i < 5) key += '-';
    }
    
    return key;
  }

  /**
   * Generate CDK object  
   */
  generateCdkObject(amount, currency, expiryDays) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiryDays);

    return {
      key: this.generateCdkKey(),
      amount: amount,
      currency: currency,
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString()
    };
  }

  /**
   * Load existing CDK data from JSON file  
   */
  async loadExistingCdks() {
    try {
      const data = await fs.readFile(this.cdksFilePath, 'utf8');
      const parsedData = JSON.parse(data);
      return parsedData.cdks || [];
    } catch (error) {
      console.error('Error loading existing CDK data:', error);
      return [];
    }
  }

  /**
   * Save CDK data to JSON file   
   */
  async saveCdks(cdks) {
    try {
      const data = { cdks: cdks };
      await fs.writeFile(this.cdksFilePath, JSON.stringify(data, null, 2), 'utf8');
      console.log(`Successfully saved ${cdks.length} CDKs to ${this.cdksFilePath}`);
    } catch (error) {
      console.error('Error saving CDK data:', error);
      throw new Error('Failed to save CDK data');
    }
  }

  /**
   * Main generate function
   */
  async generate() {
    try {
      const options = this.parseArgs();
      console.log('Generating CDKs with options:', options);

      // Load existing CDK data
      const existingCdks = await this.loadExistingCdks();
      const newCdks = [];

      // Generate new CDKs
      for (let i = 0; i < options.count; i++) {
        const newCdk = this.generateCdkObject(options.amount, options.currency, options.expiry);
        newCdks.push(newCdk);
        console.log(`Generated CDK ${i + 1}: ${newCdk.key} - ${newCdk.amount} ${newCdk.currency}`);
      }

      // Merge and save updated CDK list
      const updatedCdks = [...existingCdks, ...newCdks];
      await this.saveCdks(updatedCdks);

      console.log(`\nTotal generated: ${newCdks.length} CDKs`);
      console.log(`Total CDKs in system: ${updatedCdks.length}`);
      console.log('\nGenerated CDKs:');
      newCdks.forEach(cdk => {
        console.log(`${cdk.key} | ${cdk.amount} ${cdk.currency} | Expires: ${cdk.expires_at}`);
      });

    } catch (error) {
      console.error('Error generating CDKs:', error);
      process.exit(1);
    }
  }
}

// Execute generation
const generator = new CdkGenerator();
generator.generate();