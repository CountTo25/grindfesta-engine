use serde::Serialize;
use tokio::sync::mpsc::UnboundedSender;

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BuildEvent {
    pub stage: String,
    pub status: BuildEventStatus,
    pub message: String,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum BuildEventStatus {
    Running,
    Completed,
    Failed,
}

#[derive(Clone)]
pub struct BuildReporter {
    sender: UnboundedSender<BuildEvent>,
}

impl BuildReporter {
    pub fn new(sender: UnboundedSender<BuildEvent>) -> Self {
        Self { sender }
    }

    pub fn running(&self, stage: &str, message: impl Into<String>) {
        self.send(stage, BuildEventStatus::Running, message);
    }

    pub fn completed(&self, stage: &str, message: impl Into<String>) {
        self.send(stage, BuildEventStatus::Completed, message);
    }

    pub fn failed(&self, stage: &str, message: impl Into<String>) {
        self.send(stage, BuildEventStatus::Failed, message);
    }

    fn send(&self, stage: &str, status: BuildEventStatus, message: impl Into<String>) {
        let _ = self.sender.send(BuildEvent {
            stage: stage.into(),
            status,
            message: message.into(),
        });
    }
}
