import React from 'react';
import type { AgentStep } from '../../types/chat.types';
import { CheckCircle, Loader2, Circle, AlertCircle } from 'lucide-react';

import hanumanIcon from '../../../assets/Profile-Ai/HANUMAN-AI-512.png';
import phraramIcon from '../../../assets/Profile-Ai/PHRARAM-AI-512.png';
import phralakIcon from '../../../assets/Profile-Ai/PHRALAK-AI-512.png';
import phipekIcon from '../../../assets/Profile-Ai/PHIPEK-AI-512.png';

import './AiStepper.css';

interface AiStepperProps {
    steps: AgentStep[];
    isLive?: boolean;
}

const AGENT_ICONS: Record<string, string> = {
    hanuman: hanumanIcon,
    phraram: phraramIcon,
    phralak: phralakIcon,
    phipek: phipekIcon,
};

const getAgentIcon = (agentName: string): string | undefined => {
    const lowerName = agentName.toLowerCase();
    for (const [key, icon] of Object.entries(AGENT_ICONS)) {
        if (lowerName.includes(key)) {
            return icon;
        }
    }
    return undefined;
};

const StepStatusIcon: React.FC<{ status: AgentStep['status'] }> = ({ status }) => {
    switch (status) {
        case 'done':
            return <CheckCircle size={16} className="step-icon step-icon-done" />;
        case 'active':
            return <Loader2 size={16} className="step-icon step-icon-active animate-spin" />;
        case 'error':
            return <AlertCircle size={16} className="step-icon step-icon-error" />;
        default:
            return <Circle size={16} className="step-icon step-icon-pending" />;
    }
};

export const AiStepper: React.FC<AiStepperProps> = React.memo(({ steps, isLive = false }) => {
    if (!steps || steps.length === 0) return null;

    return (
        <div className={`ai-stepper ${isLive ? 'ai-stepper-live' : 'ai-stepper-static'}`}>
            <div className="ai-stepper-track">
                {steps.map((step, index) => {
                    const agentIcon = getAgentIcon(step.agentName);
                    return (
                        <div
                            key={step.id}
                            className={`ai-stepper-step ai-step-${step.status}`}
                        >
                            <div className="ai-step-connector-wrapper">
                                {index > 0 && (
                                    <div className={`ai-step-connector ai-step-connector-${step.status}`} />
                                )}
                            </div>

                            <div className="ai-step-node">
                                <div className="ai-step-avatar">
                                    {agentIcon ? (
                                        <img src={agentIcon} alt={step.agentName} className="ai-step-avatar-img" />
                                    ) : (
                                        <StepStatusIcon status={step.status} />
                                    )}
                                </div>

                                <div className="ai-step-status-dot">
                                    <StepStatusIcon status={step.status} />
                                </div>
                            </div>

                            <div className="ai-step-info">
                                <span className="ai-step-agent-name">{step.agentName}</span>
                                <span className="ai-step-label">{step.label}</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
});

AiStepper.displayName = 'AiStepper';
