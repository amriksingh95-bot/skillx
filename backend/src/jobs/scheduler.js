const cron = require('node-cron');
const { runDailyReminders } = require('../services/subscriptionReminderService');
const { getInactivitySummary } = require('../services/inactivityService');
const { runReengagementCampaign } = require('../services/reengagementService');
const { pauseStaleApprovedAds } = require('./staleApprovedAdsService');
const { runAdExpiryCheck } = require('./adActivationService');
const { createAuditLog } = require('../services/auditLogService');
const { releaseHeldRewards } = require('../services/merchantReferralService');

// Verbose logging helper — only logs when SCHEDULER_VERBOSE_LOGS=true
const verboseLog = (...args) => {
  if (process.env.SCHEDULER_VERBOSE_LOGS === 'true') verboseLog(...args);
};

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
let referralRewardJob = null;
let isReferralRewardRunning = false;

/**
 * Start the daily subscription reminder cron job.
 * Runs at 9:00 AM UTC every day.
 */
function startReminderJob() {
  if (reminderJob) {
    verboseLog('[Scheduler] Reminder job already running');
    return;
  }

  reminderJob = cron.schedule('0 9 * * *', async () => {
    if (isReminderRunning) {
      verboseLog('[Scheduler] Previous reminder run still in progress, skipping');
      return;
    }

    isReminderRunning = true;
    verboseLog(`[Scheduler] Starting daily subscription reminders at ${new Date().toISOString()}`);

    try {
      const summary = await runDailyReminders();
      verboseLog(`[Scheduler] Reminder run complete:`, {
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

  verboseLog('[Scheduler] Subscription reminder job started (daily at 09:00 UTC)');
}

/**
 * Start the daily inactivity summary cron job.
 * Runs at 10:00 AM UTC every day (1 hour after reminders).
 */
function startInactivityJob() {
  if (inactivityJob) {
    verboseLog('[Scheduler] Inactivity job already running');
    return;
  }

  inactivityJob = cron.schedule('0 10 * * *', async () => {
    if (isInactivityRunning) {
      verboseLog('[Scheduler] Previous inactivity run still in progress, skipping');
      return;
    }

    isInactivityRunning = true;
    verboseLog(`[Scheduler] Starting daily inactivity summary at ${new Date().toISOString()}`);

    try {
      const summary = await getInactivitySummary();
      verboseLog(`[Scheduler] Inactivity summary:`, {
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

  verboseLog('[Scheduler] Inactivity summary job started (daily at 10:00 UTC)');
}

/**
 * Start the daily re-engagement campaign cron job.
 * Runs at 11:00 AM UTC every day (1 hour after inactivity summary).
 */
function startReengagementJob() {
  if (reengagementJob) {
    verboseLog('[Scheduler] Re-engagement job already running');
    return;
  }

  reengagementJob = cron.schedule('0 11 * * *', async () => {
    if (isReengagementRunning) {
      verboseLog('[Scheduler] Previous re-engagement run still in progress, skipping');
      return;
    }

    isReengagementRunning = true;
    verboseLog(`[Scheduler] Starting daily re-engagement campaign at ${new Date().toISOString()}`);

    try {
      const summary = await runReengagementCampaign();
      if (summary.skipped) {
        verboseLog(`[Scheduler] Re-engagement skipped: ${summary.reason}`);
      } else {
        verboseLog(`[Scheduler] Re-engagement complete:`, {
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

  verboseLog('[Scheduler] Re-engagement campaign job started (daily at 11:00 UTC)');
}

/**
 * Start the daily stale approved ads auto-pause job.
 * Runs at 12:00 PM UTC every day (1 hour after re-engagement).
 */
function startStaleAdsJob() {
  if (staleAdsJob) {
    verboseLog('[Scheduler] Stale ads job already running');
    return;
  }

  staleAdsJob = cron.schedule('0 12 * * *', async () => {
    if (isStaleAdsRunning) {
      verboseLog('[Scheduler] Previous stale ads run still in progress, skipping');
      return;
    }

    isStaleAdsRunning = true;
    verboseLog(`[Scheduler] Starting stale approved ads check at ${new Date().toISOString()}`);

    try {
      const summary = await pauseStaleApprovedAds();
      verboseLog(`[Scheduler] Stale ads check complete:`, {
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

  verboseLog('[Scheduler] Stale approved ads auto-pause job started (daily at 12:00 UTC)');
}

/**
 * Start the ad expiry check cron job.
 * Runs every 5 minutes — expires overdue live ads.
 */
function startAdActivationJob() {
  if (adActivationJob) {
    verboseLog('[Scheduler] Ad activation job already running');
    return;
  }

  adActivationJob = cron.schedule('*/5 * * * *', async () => {
    if (isAdActivationRunning) {
      verboseLog('[Scheduler] Previous ad activation run still in progress, skipping');
      return;
    }

    isAdActivationRunning = true;
    verboseLog(`[Scheduler] Starting ad expiry check at ${new Date().toISOString()}`);

    try {
      const summary = await runAdExpiryCheck();
      verboseLog(`[Scheduler] Ad expiry check complete:`, {
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

  verboseLog('[Scheduler] Ad expiry check job started (every 5 minutes)');
}

/**
 * Start the daily stale pending payments reminder job.
 * Runs at 2:00 PM UTC every day (1 hour after expired ads job).
 */
function startStalePendingPaymentsJob() {
  if (stalePendingPaymentsJob) {
    verboseLog('[Scheduler] Stale pending payments job already running');
    return;
  }

  stalePendingPaymentsJob = cron.schedule('0 14 * * *', async () => {
    if (isStalePendingPaymentsRunning) {
      verboseLog('[Scheduler] Previous stale pending payments run still in progress, skipping');
      return;
    }

    isStalePendingPaymentsRunning = true;
    verboseLog(`[Scheduler] Starting stale pending payments check at ${new Date().toISOString()}`);

    try {
      const { remindStalePendingPayments } = require('./stalePendingPaymentsService');
      const summary = await remindStalePendingPayments();
      verboseLog(`[Scheduler] Stale pending payments check complete:`, {
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

  verboseLog('[Scheduler] Stale pending payments reminder job started (daily at 14:00 UTC)');
}

/**
 * Start the referral reward release cron job.
 * Runs every 30 minutes to release held referral rewards past the 15-day hold.
 */
function startReferralRewardJob() {
  if (referralRewardJob) {
    verboseLog('[Scheduler] Referral reward job already running');
    return;
  }

  referralRewardJob = cron.schedule('*/30 * * * *', async () => {
    if (isReferralRewardRunning) {
      verboseLog('[Scheduler] Previous referral reward run still in progress, skipping');
      return;
    }

    isReferralRewardRunning = true;
    verboseLog(`[Scheduler] Starting referral reward release at ${new Date().toISOString()}`);

    try {
      const summary = await releaseHeldRewards();
      verboseLog(`[Scheduler] Referral reward release complete:`, {
        processed: summary.processed,
        credited: summary.results.filter(r => r.credited).length
      });
    } catch (error) {
      console.error('[Scheduler] Referral reward release failed:', error.message);
    } finally {
      isReferralRewardRunning = false;
    }
  }, {
    scheduled: true,
    timezone: 'UTC'
  });

  verboseLog('[Scheduler] Referral reward release job started (every 30 minutes)');
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
  startReferralRewardJob();
}

/**
 * Stop all scheduler jobs.
 */
function stopScheduler() {
  if (reminderJob) {
    reminderJob.stop();
    reminderJob = null;
    verboseLog('[Scheduler] Subscription reminder job stopped');
  }
  if (inactivityJob) {
    inactivityJob.stop();
    inactivityJob = null;
    verboseLog('[Scheduler] Inactivity summary job stopped');
  }
  if (reengagementJob) {
    reengagementJob.stop();
    reengagementJob = null;
    verboseLog('[Scheduler] Re-engagement campaign job stopped');
  }
  if (staleAdsJob) {
    staleAdsJob.stop();
    staleAdsJob = null;
    verboseLog('[Scheduler] Stale ads auto-pause job stopped');
  }
  if (adActivationJob) {
    adActivationJob.stop();
    adActivationJob = null;
    verboseLog('[Scheduler] Ad activation cycle job stopped');
  }
  if (stalePendingPaymentsJob) {
    stalePendingPaymentsJob.stop();
    stalePendingPaymentsJob = null;
    verboseLog('[Scheduler] Stale pending payments reminder job stopped');
  }
  if (referralRewardJob) {
    referralRewardJob.stop();
    referralRewardJob = null;
    verboseLog('[Scheduler] Referral reward release job stopped');
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
  verboseLog(`[Scheduler] Manual reminder run triggered at ${new Date().toISOString()}`);

  try {
    const summary = await runDailyReminders();
    verboseLog(`[Scheduler] Manual run complete:`, {
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
  verboseLog(`[Scheduler] Manual inactivity run triggered at ${new Date().toISOString()}`);

  try {
    const summary = await getInactivitySummary();
    verboseLog(`[Scheduler] Inactivity run complete:`, summary);
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
  verboseLog(`[Scheduler] Manual re-engagement run triggered at ${new Date().toISOString()}`);

  try {
    const summary = await runReengagementCampaign();
    verboseLog(`[Scheduler] Re-engagement run complete:`, summary);
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
  verboseLog(`[Scheduler] Manual stale ads run triggered at ${new Date().toISOString()}`);

  try {
    const summary = await pauseStaleApprovedAds();
    verboseLog(`[Scheduler] Manual stale ads run complete:`, summary);
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
  verboseLog(`[Scheduler] Manual ad expiry check triggered at ${new Date().toISOString()}`);

  try {
    const summary = await runAdExpiryCheck();
    verboseLog(`[Scheduler] Manual ad expiry check complete:`, summary);
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
  verboseLog(`[Scheduler] Manual stale pending payments run triggered at ${new Date().toISOString()}`);

  try {
    const { remindStalePendingPayments } = require('./stalePendingPaymentsService');
    const summary = await remindStalePendingPayments();
    verboseLog(`[Scheduler] Manual stale pending payments run complete:`, summary);
    return summary;
  } catch (error) {
    console.error('[Scheduler] Manual stale pending payments run failed:', error.message);
    return { error: error.message };
  } finally {
    isStalePendingPaymentsRunning = false;
  }
}

/**
 * Run referral reward release immediately (for manual trigger or testing).
 */
async function runReferralRewardNow() {
  if (isReferralRewardRunning) {
    return { error: 'Previous run still in progress' };
  }

  isReferralRewardRunning = true;
  verboseLog(`[Scheduler] Manual referral reward release triggered at ${new Date().toISOString()}`);

  try {
    const summary = await releaseHeldRewards();
    verboseLog(`[Scheduler] Manual referral reward release complete:`, summary);
    return summary;
  } catch (error) {
    console.error('[Scheduler] Manual referral reward release failed:', error.message);
    return { error: error.message };
  } finally {
    isReferralRewardRunning = false;
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
  runReferralRewardNow,
  getStatus
};
