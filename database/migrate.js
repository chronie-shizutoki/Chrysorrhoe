// 数据库迁移工具
// 用于执行数据库迁移脚本
// 迁移脚本应在migrations目录下，文件名格式为YYYYMMDDHHMMSS_*.sql
// 例如：20230101000000_create_wallets_table.sql

const fs = require('fs');
const path = require('path');

// 动态加载数据库配置
function loadDatabaseConfig() {
  try {
    const dbConfigPath = path.join(__dirname, '..', 'server', 'config', 'database.js');
    if (fs.existsSync(dbConfigPath)) {
      return require(dbConfigPath);
    } else {
      console.error('无法找到数据库配置文件:', dbConfigPath);
      process.exit(1);
    }
  } catch (error) {
    console.error('加载数据库配置失败:', error.message);
    process.exit(1);
  }
}

// 读取迁移脚本
function readMigrationScript(scriptPath) {
  try {
    return fs.readFileSync(scriptPath, 'utf8');
  } catch (error) {
    console.error('读取迁移脚本失败:', error.message);
    process.exit(1);
  }
}

// 执行SQL脚本
async function executeSqlScript(dbAsync, sqlScript) {
  // 移除注释和空行
  const cleanScript = sqlScript
    .split('\n')
    .filter(line => {
      const trimmed = line.trim();
      return trimmed && !trimmed.startsWith('--');
    })
    .join('\n');

  // 分割SQL语句
  const statements = [];
  let currentStatement = '';
  let inTrigger = false;
  let braceCount = 0;

  for (const line of cleanScript.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    currentStatement += line + '\n';

    // 检查是否进入触发器
    if (trimmed.toUpperCase().includes('CREATE TRIGGER')) {
      inTrigger = true;
    }

    // 在触发器中计算大括号
    if (inTrigger) {
      for (const char of trimmed) {
        if (char === '{') braceCount++;
        if (char === '}') braceCount--;
      }
      
      // 检查是否是BEGIN/END块
      if (trimmed.toUpperCase() === 'BEGIN') {
        braceCount++;
      } else if (trimmed.toUpperCase() === 'END;') {
        braceCount--;
      }
    }

    // 检查是否是语句结束
    if (trimmed.endsWith(';')) {
      if (!inTrigger || (inTrigger && braceCount <= 0)) {
        statements.push(currentStatement.trim());
        currentStatement = '';
        inTrigger = false;
        braceCount = 0;
      }
    }
  }

  // 如果还有未完成的语句
  if (currentStatement.trim()) {
    statements.push(currentStatement.trim());
  }

  // 执行每个语句
  for (const statement of statements) {
    if (statement.trim()) {
      try {
        await dbAsync.run(statement);
        const preview = statement.replace(/\s+/g, ' ').substring(0, 50);
        console.log('执行SQL语句成功:', preview + '...');
      } catch (error) {
        const preview = statement.replace(/\s+/g, ' ').substring(0, 50);
        console.error('执行SQL语句失败:', preview + '...', error.message);
        console.error('完整语句:', statement);
        throw error;
      }
    }
  }
}

// 执行指定的迁移脚本
async function runMigration(scriptFileName) {
  try {
    console.log('开始执行数据库迁移...');
    
    // 加载数据库配置
    const { dbAsync } = loadDatabaseConfig();
    
    // 构建迁移脚本路径
    const scriptPath = path.join(__dirname, 'migrations', scriptFileName);
    
    if (!fs.existsSync(scriptPath)) {
      console.error('迁移脚本不存在:', scriptPath);
      process.exit(1);
    }
    
    // 读取迁移脚本
    const migrationScript = readMigrationScript(scriptPath);
    
    // 执行迁移脚本
    await executeSqlScript(dbAsync, migrationScript);
    
    console.log('数据库迁移执行成功:', scriptFileName);
    process.exit(0);
    
  } catch (error) {
    console.error('数据库迁移失败:', error.message);
    process.exit(1);
  }
}

// 执行所有迁移脚本
async function runAllMigrations() {
  try {
    console.log('开始执行所有数据库迁移...');
    
    // 加载数据库配置
    const { dbAsync } = loadDatabaseConfig();
    
    // 获取migrations目录下的所有SQL文件
    const migrationsDir = path.join(__dirname, 'migrations');
    
    if (!fs.existsSync(migrationsDir)) {
      console.error('migrations目录不存在:', migrationsDir);
      process.exit(1);
    }
    
    // 读取并按文件名排序（假设文件名包含日期前缀）
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();
    
    if (migrationFiles.length === 0) {
      console.log('没有找到需要执行的迁移脚本');
      process.exit(0);
    }
    
    console.log(`找到 ${migrationFiles.length} 个迁移脚本，将按顺序执行:`);
    migrationFiles.forEach(file => console.log(`- ${file}`));
    
    // 逐一执行迁移脚本
    for (const file of migrationFiles) {
      console.log(`\n执行迁移脚本: ${file}`);
      const scriptPath = path.join(migrationsDir, file);
      const migrationScript = readMigrationScript(scriptPath);
      await executeSqlScript(dbAsync, migrationScript);
      console.log(`迁移脚本执行成功: ${file}`);
    }
    
    console.log('\n所有数据库迁移执行成功');
    process.exit(0);
    
  } catch (error) {
    console.error('数据库迁移失败:', error.message);
    process.exit(1);
  }
}

// 解析命令行参数
function parseArgs() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    return { command: 'all' };
  }
  
  if (args[0] === '--script' && args.length > 1) {
    return { command: 'single', scriptName: args[1] };
  }
  
  return { command: 'unknown' };
}

// 主函数
async function main() {
  const args = parseArgs();
  
  if (args.command === 'all') {
    await runAllMigrations();
  } else if (args.command === 'single' && args.scriptName) {
    await runMigration(args.scriptName);
  } else {
    console.log('用法:');
    console.log('  node migrate.js                   # 执行所有迁移脚本');
    console.log('  node migrate.js --script <filename> # 执行指定的迁移脚本');
    process.exit(0);
  }
}

// 执行主函数
main();