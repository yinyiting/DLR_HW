# Multi-Armed Bandit (MAB) Simulation with Four Algorithms
import numpy as np
import matplotlib.pyplot as plt

# --------------------------
# Global Simulation Settings
# --------------------------
np.random.seed(0)
n_arms = 10
n_steps = 1000
n_trials = 200
true_rewards = np.random.normal(0, 1, n_arms)

def simulate_bandit():
    return np.random.normal(true_rewards, 1)

# --------------------------
# Algorithm Implementations
# --------------------------
class EpsilonGreedy:
    def __init__(self, n_arms, epsilon=0.1):
        self.epsilon = epsilon
        self.counts = np.zeros(n_arms)
        self.values = np.zeros(n_arms)
        self.explore_flags = []

    def select_action(self):
        if np.random.rand() < self.epsilon:
            self.explore_flags.append(1)
            return np.random.randint(len(self.values))
        else:
            self.explore_flags.append(0)
            return np.argmax(self.values)

    def update(self, action, reward):
        self.counts[action] += 1
        self.values[action] += (reward - self.values[action]) / self.counts[action]

class UCB:
    def __init__(self, n_arms):
        self.counts = np.zeros(n_arms)
        self.values = np.zeros(n_arms)
        self.total_counts = 0
        self.explore_flags = []

    def select_action(self):
        self.total_counts += 1
        for a in range(len(self.values)):
            if self.counts[a] == 0:
                self.explore_flags.append(1)
                return a
        confidence_bounds = self.values + np.sqrt((2 * np.log(self.total_counts)) / self.counts)
        self.explore_flags.append(0)
        return np.argmax(confidence_bounds)

    def update(self, action, reward):
        self.counts[action] += 1
        self.values[action] += (reward - self.values[action]) / self.counts[action]

class Softmax:
    def __init__(self, n_arms, tau=0.1):
        self.tau = tau
        self.values = np.zeros(n_arms)
        self.explore_flags = []

    def select_action(self):
        exp_vals = np.exp(self.values / self.tau)
        probs = exp_vals / np.sum(exp_vals)
        choice = np.random.choice(len(self.values), p=probs)
        self.explore_flags.append(1 if probs[choice] < 1.0 else 0)
        return choice

    def update(self, action, reward):
        self.values[action] += 0.1 * (reward - self.values[action])

class ThompsonSampling:
    def __init__(self, n_arms):
        self.alpha = np.ones(n_arms)
        self.beta = np.ones(n_arms)
        self.explore_flags = []

    def select_action(self):
        samples = np.random.beta(self.alpha, self.beta)
        greedy = np.argmax(self.alpha / (self.alpha + self.beta))
        sampled = np.argmax(samples)
        self.explore_flags.append(1 if sampled != greedy else 0)
        return sampled

    def update(self, action, reward):
        if reward > 0:
            self.alpha[action] += 1
        else:
            self.beta[action] += 1

# --------------------------
# Simulation Core Function
# --------------------------
def run_simulation(agent_class):
    rewards = np.zeros(n_steps)
    explore_ratios = np.zeros(n_steps)

    for _ in range(n_trials):
        agent = agent_class(n_arms)
        explore_flags = []

        for t in range(n_steps):
            action = agent.select_action()
            reward = simulate_bandit()[action]
            agent.update(action, reward)
            rewards[t] += reward
            explore_flags.append(agent.explore_flags[-1])

        explore_ratios += np.cumsum(explore_flags) / (np.arange(1, n_steps + 1))

    rewards /= n_trials
    explore_ratios /= n_trials

    return rewards, explore_ratios

# --------------------------
# Execute Simulations
# --------------------------
eg_rewards, eg_explore = run_simulation(lambda n: EpsilonGreedy(n, epsilon=0.1))
ucb_rewards, ucb_explore = run_simulation(UCB)
softmax_rewards, softmax_explore = run_simulation(lambda n: Softmax(n, tau=0.1))
ts_rewards, ts_explore = run_simulation(ThompsonSampling)

# --------------------------
# Plot Results
# --------------------------
plt.figure(figsize=(10, 6))
plt.plot(np.cumsum(eg_rewards), label='Epsilon-Greedy')
plt.plot(np.cumsum(ucb_rewards), label='UCB')
plt.plot(np.cumsum(softmax_rewards), label='Softmax')
plt.plot(np.cumsum(ts_rewards), label='Thompson Sampling')
plt.title('Cumulative Reward Comparison')
plt.xlabel('Steps')
plt.ylabel('Cumulative Reward')
plt.legend()
plt.grid(True)
plt.tight_layout()
plt.savefig("cumulative_reward_comparison.png")  # 儲存圖表

plt.figure(figsize=(10, 4))
plt.plot(eg_explore, label='Epsilon-Greedy')
plt.plot(ucb_explore, label='UCB')
plt.plot(softmax_explore, label='Softmax')
plt.plot(ts_explore, label='Thompson Sampling')
plt.title('Explore Ratio Over Time (All Algorithms)')
plt.xlabel('Steps')
plt.ylabel('Explore Ratio')
plt.legend()
plt.grid(True)
plt.tight_layout()
plt.savefig("explore_ratio_over_time.png")  # 儲存圖表
