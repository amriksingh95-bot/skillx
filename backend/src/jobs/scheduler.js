const cron = require('node-cron');
const { runDailyReminders } = require('../services/subscriptionReminderService');
const { getInactivitySummary } = require('../services/inactivityService');
const { runReengagementCampaign } = require('../services/reengagementService');
const { pauseStaleApprovedAds } = require('./staleApprovedAdsService');
const { runAdExpiryCheck } = require('./adActivationService');
const { createAuditLog } = require('../services/auditLogService');

let reminderJob = null;
let isReminderRunning = false;
let inactivityJob = null;
let isInactivityRunning = false;
let reengagementJob = null;
let isReengagementRunning = false;
let staleAdsJob = null;
let isStaleAdsRunning = false;
let adActivationJob = null;
let isAdActivationRunning = false;
let stalePendingPaymentsJob = null;
let isStalePendingPaymentsRunning = false;

/**
 * Start the daily subscription reminder cron job.
 * Runs at 9:00 AM UTC every day.
 */
function startReminderJob() {
  if (reminderJob) {
    console.log('[Scheduler] Reminder job already running');
    return;
  }

  reminderJob = cron.schedule('0 9 * * *', async () => {
    if (isReminderRunning) {
      console.log('[Scheduler] Previous reminder run still in progress, skipping');
      return;
    }

    isReminderRunning = true;
    console.log(`[Scheduler] Starting daily subscription reminders at ${new Date().toISOString()}`);

    try {
      const summary = await runDailyReminders();
      console.log(`[Scheduler] Reminder run complete:`, {
        total: summary.total,
        sent: summary.sent,
        skipped: summary.skipped,
        failed: summary.failed
      });

      if (summary.errors.length > 0) {
        console.error('[Scheduler] Errors encountered:', summary.errors);
      }
    } catch (error) {
      console.error('[Scheduler] Reminder run failed:', error.message);
    } finally {
      isReminderRunning = false;
    }
  }, {
    scheduled: true,
    timezone: 'UTC'
  });

  console.log('[Scheduler] Subscription reminder job started (daily at 09:00 UTC)');
}

/**
 * Start the daily inactivity summary cron job.
 * Runs at 10:00 AM UTC every day (1 hour after reminders).
 */
function startInactivityJob() {
  if (inactivityJob) {
    console.log('[Scheduler] Inactivity job already running');
    return;
  }

  inactivityJob = cron.schedule('0 10 * * *', async () => {
    if (isInactivityRunning) {
      console.log('[Scheduler] Previous inactivity run still in progress, skipping');
      return;
    }

    isInactivityRunning = true;
    console.log(`[Scheduler] Starting daily inactivity summary at ${new Date().toISOString()}`);

    try {
      const summary = await getInactivitySummary();
      console.log(`[Scheduler] Inactivity summary:`, {
        merchants: summary.merchants,
        customers: summary.customers
      });

      await createAuditLog(
        null,
        'INACTIVITY_SUMMARY_DAILY',
        null,
        null,
        {
          merchants: summary.merchants,
          customers: summary.customers,
          timestamp: new Date().toISOString()
        },
        null
      );
    } catch (error) {
      console.error('[Scheduler] Inactivity summary failed:', error.message);
    } finally {
      isInactivityRunning = false;
    }
  }, {
    scheduled: true,
    timezone: 'UTC'
  });

  console.log('[Scheduler] Inactivity summary job started (daily at 10:00 UTC)');
}

/**
 * Start the daily re-engagement campaign cron job.
 * Runs at 11:00 AM UTC every day (1 hour after inactivity summary).
 */
function startReengagementJob() {
  if (reengagementJob) {
    console.log('[Scheduler] Re-engagement job already running');
    return;
  }

  reengagementJob = cron.schedule('0 11 * * *', async () => {
    if (isReengagementRunning) {
      console.log('[Scheduler] Previous re-engagement run still in progress, skipping');
      return;
    }

    isReengagementRunning = true;
    console.log(`[Scheduler] Starting daily re-engagement campaign at ${new Date().toISOString()}`);

    try {
      const summary = await runReengagementCampaign();
      if (summary.skipped) {
        console.log(`[Scheduler] Re-engagement skipped: ${summary.reason}`);
      } else {
        console.log(`[Scheduler] Re-engagement complete:`, {
          dormant: summary.dormant,
          neverRedeemed: summary.neverRedeemed,
          highBalance: summary.highBalance
        });
      }
    } catch (error) {
      console.error('[Scheduler] Re-engagement campaign failed:', error.message);
    } finally {
      isReengagementRunning = false;
    }
  }, {
    scheduled: true,
    timezone: 'UTC'
  });

  console.log('[Scheduler] Re-engagement campaign job started (daily at 11:00 UTC)');
}

/**
 * Start the daily stale approved ads auto-pause job.
 * Runs at 12:00 PM UTC every day (1 hour after re-engagement).
 */
function startStaleAdsJob() {
  if (staleAdsJob) {
    console.log('[Scheduler] Stale ads job already running');
    return;
  }

  staleAdsJob = cron.schedule('0 12 * * *', async () => {
    if (isStaleAdsRunning) {
      console.log('[Scheduler] Previous stale ads run still in progress, skipping');
      return;
    }

    isStaleAdsRunning = true;
    console.log(`[Scheduler] Starting stale approved ads check at ${new Date().toISOString()}`);

    try {
      const summary = await pauseStaleApprovedAds();
      console.log(`[Scheduler] Stale ads check complete:`, {
        total: summary.total,
        paused: summary.paused,
        failed: summary.failed
      });

      if (summary.errors.length > 0) {
        console.error('[Scheduler] Errors encountered:', summary.errors);
      }
    } catch (error) {
      console.error('[Scheduler] Stale ads check failed:', error.message);
    } finally {
      isStaleAdsRunning = false;
    }
  }, {
    scheduled: true,
    timezone: 'UTC'
  });

  console.log('[Scheduler] Stale approved ads auto-pause job started (daily at 12:00 UTC)');
}

/**
 * Start the ad expiry check cron job.
 * Runs every 5 minutes — expires overdue live ads.
 */
function startAdActivationJob() {
  if (adActivationJob) {
    console.log('[Scheduler] Ad activation job already running');
    return;
  }

  adActivationJob = cron.schedule('*/5 * * * *', async () => {
    if (isAdActivationRunning) {
      console.log('[Scheduler] Previous ad activation run still in progress, skipping');
      return;
    }

    isAdActivationRunning = true;
    console.log(`[Scheduler] Starting ad expiry check at ${new Date().toISOString()}`);

    try {
      const summary = await runAdExpiryCheck();
      console.log(`[Scheduler] Ad expiry check complete:`, {
        expired: summary.expired,
        failed: summary.failed
      });

      if (summary.errors.length > 0) {
        console.error('[Scheduler] Errors encountered:', summary.errors);
      }
    } catch (error) {
      console.error('[Scheduler] Ad expiry check failed:', error.message);
    } finally {
      isAdActivationRunning = false;
    }
  }, {
    scheduled: true,
    timezone: 'UTC'
  });

  console.log('[Scheduler] Ad expiry check job started (every 5 minutes)');
}

/**
 * Start the daily stale pending payments reminder job.
 * Runs at 2:00 PM UTC every day (1 hour after expired ads job).
 */
function startStalePendingPaymentsJob() {
  if (stalePendingPaymentsJob) {
    console.log('[Scheduler] Stale pending payments job already running');
    return;
  }

  stalePendingPaymentsJob = cron.schedule('0 14 * * *', async () => {
    if (isStalePendingPaymentsRunning) {
      console.log('[Scheduler] Previous stale pending payments run still in progress, skipping');
      return;
    }

    isStalePendingPaymentsRunning = true;
    console.log(`[Scheduler] Starting stale pending payments check at ${new Date().toISOString()}`);

    try {
      const { remindStalePendingPayments } = require('./stalePendingPaymentsService');
      const summary = await remindStalePendingPayments();
      console.log(`[Scheduler] Stale pending payments check complete:`, {
        total: summary.total,
        remindersSent: summary.remindersSent,
        skipped: summary.skipped,
        failed: summary.failed
      });

      if (summary.errors.length > 0) {
        console.error('[Scheduler] Errors encountered:', summary.errors);
      }
    } catch (error) {
      console.error('[Scheduler] Stale pending payments check failed:', error.message);
    } finally {
      isStalePendingPaymentsRunning = false;
    }
  }, {
    scheduled: true,
    timezone: 'UTC'
  });

  console.log('[Scheduler] Stale pending payments reminder job started (daily at 14:00 UTC)');
}

/**
 * Start all scheduler jobs.
 */
function startScheduler() {
  startReminderJob();
  startInactivityJob();
  startReengagementJob();
  startStaleAdsJob();
  startAdActivationJob();
  startStalePendingPaymentsJob();
}

/**
 * Stop all scheduler jobs.
 */
function stopScheduler() {
  if (reminderJob) {
    reminderJob.stop();
    reminderJob = null;
    console.log('[Scheduler] Subscription reminder job stopped');
  }
  if (inactivityJob) {
    inactivityJob.stop();
    inactivityJob = null;
    console.log('[Scheduler] Inactivity summary job stopped');
  }
  if (reengagementJob) {
    reengagementJob.stop();
    reengagementJob = null;
    console.log('[Scheduler] Re-engagement campaign job stopped');
  }
  if (staleAdsJob) {
    staleAdsJob.stop();
    staleAdsJob = null;
    console.log('[Scheduler] Stale ads auto-pause job stopped');
  }
  if (adActivationJob) {
    adActivationJob.stop();
    adActivationJob = null;
    console.log('[Scheduler] Ad activation cycle job stopped');
  }
  if (stalePendingPaymentsJob) {
    stalePendingPaymentsJob.stop();
    stalePendingPaymentsJob = null;
    console.log('[Scheduler] Stale pending payments reminder job stopped');
  }
}

/**
 * Run reminders immediately (for manual trigger or testing).
 */
async function runNow() {
  if (isReminderRunning) {
    return { error: 'Previous run still in progress' };
  }

  isReminderRunning = true;
  console.log(`[Scheduler] Manual reminder run triggered at ${new Date().toISOString()}`);

  try {
    const summary = await runDailyReminders();
    console.log(`[Scheduler] Manual run complete:`, {
      total: summary.total,
      sent: summary.sent,
      skipped: summary.skipped,
      failed: summary.failed
    });
    return summary;
  } catch (error) {
    console.error('[Scheduler] Manual run failed:', error.message);
    return { error: error.message };
  } finally {
    isReminderRunning = false;
  }
}

/**
 * Run inactivity summary immediately (for manual trigger or testing).
 */
async function runInactivityNow() {
  if (isInactivityRunning) {
    return { error: 'Previous inactivity run still in progress' };
  }

  isInactivityRunning = true;
  console.log(`[Scheduler] Manual inactivity run triggered at ${new Date().toISOString()}`);

  try {
    const summary = await getInactivitySummary();
    console.log(`[Scheduler] Inactivity run complete:`, summary);
    return summary;
  } catch (error) {
    console.error('[Scheduler] Inactivity run failed:', error.message);
    return { error: error.message };
  } finally {
    isInactivityRunning = false;
  }
}

/**
 * Run re-engagement campaign immediately (for manual trigger or testing).
 */
async function runReengagementNow() {
  if (isReengagementRunning) {
    return { error: 'Previous re-engagement run still in progress' };
  }

  isReengagementRunning = true;
  console.log(`[Scheduler] Manual re-engagement run triggered at ${new Date().toISOString()}`);

  try {
    const summary = await runReengagementCampaign();
    console.log(`[Scheduler] Re-engagement run complete:`, summary);
    return summary;
  } catch (error) {
    console.error('[Scheduler] Re-engagement run failed:', error.message);
    return { error: error.message };
  } finally {
    isReengagementRunning = false;
  }
}

/**
 * Get scheduler status.
 */
function getStatus() {
  return {
    reminderJob: { running: !!reminderJob, processing: isReminderRunning },
    inactivityJob: { running: !!inactivityJob, processing: isInactivityRunning },
    reengagementJob: { running: !!reengagementJob, processing: isReengagementRunning },
    staleAdsJob: { running: !!staleAdsJob, processing: isStaleAdsRunning },
    adActivationJob: { running: !!adActivationJob, processing: isAdActivationRunning },
    stalePendingPaymentsJob: { running: !!stalePendingPaymentsJob, processing: isStalePendingPaymentsRunning },
    schedules: {
      reminders: '0 9 * * *',
      inactivity: '0 10 * * *',
      reengagement: '0 11 * * *',
      staleAds: '0 12 * * *',
      adActivation: '*/5 * * * *',
      stalePendingPayments: '0 14 * * *'
    },
    descriptions: {
      reminders: 'Daily at 09:00 UTC',
      inactivity: 'Daily at 10:00 UTC',
      reengagement: 'Daily at 11:00 UTC',
      staleAds: 'Daily at 12:00 UTC',
      adActivation: 'Every 5 minutes',
      stalePendingPayments: 'Daily at 14:00 UTC'
    }
  };
}

/**
 * Run stale ads check immediately (for manual trigger or testing).
 */
async function runStaleAdsNow() {
  if (isStaleAdsRunning) {
    return { error: 'Previous run still in progress' };
  }

  isStaleAdsRunning = true;
  console.log(`[Scheduler] Manual stale ads run triggered at ${new Date().toISOString()}`);

  try {
    const summary = await pauseStaleApprovedAds();
    console.log(`[Scheduler] Manual stale ads run complete:`, summary);
    return summary;
  } catch (error) {
    console.error('[Scheduler] Manual stale ads run failed:', error.message);
    return { error: error.message };
  } finally {
    isStaleAdsRunning = false;
  }
}

/**
 * Run ad activation cycle immediately (for manual trigger or testing).
 */
async function runAdActivationNow() {
  if (isAdActivationRunning) {
    return { error: 'Previous run still in progress' };
  }

  isAdActivationRunning = true;
  console.log(`[Scheduler] Manual ad expiry check triggered at ${new Date().toISOString()}`);

  try {
    const summary = await runAdExpiryCheck();
    console.log(`[Scheduler] Manual ad expiry check complete:`, summary);
    return summary;
  } catch (error) {
    console.error('[Scheduler] Manual ad expiry check failed:', error.message);
    return { error: error.message };
  } finally {
    isAdActivationRunning = false;
  }
}

/**
 * Run stale pending payments reminder immediately (for manual trigger or testing).
 */
async function runStalePendingPaymentsNow() {
  if (isStalePendingPaymentsRunning) {
    return { error: 'Previous run still in progress' };
  }

  isStalePendingPaymentsRunning = true;
  console.log(`[Scheduler] Manual stale pending payments run triggered at ${new Date().toISOString()}`);

  try {
    const { remindStalePendingPayments } = require('./stalePendingPaymentsService');
    const summary = await remindStalePendingPayments();
    console.log(`[Scheduler] Manual stale pending payments run complete:`, summary);
    return summary;
  } catch (error) {
    console.error('[Scheduler] Manual stale pending payments run failed:', error.message);
    return { error: error.message };
  } finally {
    isStalePendingPaymentsRunning = false;
  }
}

module.exports = {
  startScheduler,
  stopScheduler,
  runNow,
  runInactivityNow,
  runReengagementNow,
  runStaleAdsNow,
  runAdActivationNow,
  runStalePendingPaymentsNow,
  getStatus
};
