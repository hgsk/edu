#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo 'Usage: sudo bash setup-azure-practice.sh setup | add-student STUDENT_ID PUBLIC_KEY_FILE' >&2
  exit 2
}

[[ $# -ge 1 ]] || usage
action=$1

if [[ "$action" == add-student ]]; then
  [[ $# -eq 3 && "$2" =~ ^[a-z][a-z0-9_-]{1,30}$ && -f "$3" ]] || usage
  student=$2
  key_file=$3
  [[ $(wc -l < "$key_file") -eq 1 ]] || { echo '公開鍵は1行にしてください' >&2; exit 2; }
  [[ $(head -c 12 "$key_file") == 'ssh-ed25519 ' ]] || { echo 'ssh-ed25519 公開鍵だけを受け付けます' >&2; exit 2; }
  ssh-keygen -lf "$key_file" >/dev/null || { echo '公開鍵が不正です' >&2; exit 2; }
elif [[ "$action" == setup ]]; then
  [[ $# -eq 1 ]] || usage
else
  usage
fi

[[ $EUID -eq 0 ]] || { echo 'sudo で実行してください' >&2; exit 2; }

if [[ "$action" == setup ]]; then
  [[ -r /etc/os-release ]] || { echo 'Ubuntuを確認できません' >&2; exit 1; }
  . /etc/os-release
  [[ "$ID" == ubuntu ]] || { echo 'このスクリプトはUbuntu専用です' >&2; exit 1; }
  apache_conf=/etc/apache2/conf-available/hht-practice.conf
  if [[ -e "$apache_conf" ]] && ! grep -q '^# Managed by hht-practice$' "$apache_conf"; then
    echo "$apache_conf は既存の設定です。上書きせず停止します" >&2
    exit 1
  fi
  limits_conf=/etc/security/limits.d/90-hht-students.conf
  if [[ -e "$limits_conf" ]] && ! grep -q '^# Managed by hht-practice$' "$limits_conf"; then
    echo "$limits_conf は既存の設定です。上書きせず停止します" >&2
    exit 1
  fi
  if [[ -L /srv/hht-public ]]; then
    echo '/srv/hht-public がシンボリックリンクです。設定を停止します' >&2
    exit 1
  fi
  if [[ ! -e "$apache_conf" && -d /srv/hht-public ]] &&
     [[ -n $(find /srv/hht-public -mindepth 1 -maxdepth 1 -print -quit) ]]; then
    echo '/srv/hht-public に既存データがあります。配信対象を確認してください' >&2
    exit 1
  fi
  export DEBIAN_FRONTEND=noninteractive
  apt-get update
  apt-get install -y apache2 openssh-server
  groupadd -f hht-students
  install -d -m 0755 -o root -g root /srv/hht-public
  install -d -m 0755 -o root -g root /etc/ssh/hht-authorized-keys

  cat > "$limits_conf" <<'EOF'
# Managed by hht-practice
@hht-students hard fsize 51200
@hht-students hard nproc 32
EOF

  cat > "$apache_conf" <<'EOF'
# Managed by hht-practice
Alias /students/ /srv/hht-public/
<Directory /srv/hht-public>
    Options -Indexes -FollowSymLinks -ExecCGI
    AllowOverride None
    Require all granted
</Directory>
<LocationMatch "^/students/(?:[^/]+/)*\.">
    Require all denied
</LocationMatch>
EOF
  a2enconf hht-practice >/dev/null
  apache2ctl configtest
  systemctl enable --now apache2
  systemctl reload apache2

  ssh_conf=/etc/ssh/sshd_config
  if grep -q '^# BEGIN HHT STUDENTS$' "$ssh_conf" &&
     ! grep -q '^    AuthorizedKeysFile /etc/ssh/hht-authorized-keys/%u$' "$ssh_conf"; then
    echo '既存の HHT SSH 設定を確認してください。自動上書きはしません。' >&2
    exit 1
  fi
  if ! grep -q '^# BEGIN HHT STUDENTS$' "$ssh_conf"; then
    backup="${ssh_conf}.hht-backup-$(date -u +%Y%m%dT%H%M%SZ)"
    cp -p "$ssh_conf" "$backup"
    cat >> "$ssh_conf" <<'EOF'

# BEGIN HHT STUDENTS
Match Group hht-students
    AuthenticationMethods publickey
    AuthorizedKeysFile /etc/ssh/hht-authorized-keys/%u
    PasswordAuthentication no
    KbdInteractiveAuthentication no
    AllowTcpForwarding no
    X11Forwarding no
    PermitTunnel no
# END HHT STUDENTS
EOF
    if ! /usr/sbin/sshd -t; then
      cp -p "$backup" "$ssh_conf"
      echo "SSH設定を戻しました: $backup" >&2
      exit 1
    fi
    systemctl reload ssh
  fi
  echo 'ApacheとSSHの設定が完了しました。Azure NSGのTCP 22/80を別途確認してください。'
  exit 0
fi

getent group hht-students >/dev/null || { echo '先に setup を実行してください' >&2; exit 1; }
[[ -f /etc/apache2/conf-available/hht-practice.conf ]] || { echo '先に setup を実行してください' >&2; exit 1; }
account="hht-${student}"
web_dir="/srv/hht-public/$student"
if [[ -L "$web_dir" || -L "$web_dir/index.html" ]]; then
  echo "$web_dir にシンボリックリンクがあります。設定を停止します" >&2
  exit 1
fi
if id "$account" >/dev/null 2>&1; then
  id -nG "$account" | tr ' ' '\n' | grep -qx hht-students || {
    echo "$account は既存の別用途アカウントです" >&2
    exit 1
  }
  if [[ -e "$web_dir" ]] &&
     [[ $(stat -c %U "$web_dir") != "$account" || $(stat -c %G "$web_dir") != www-data ]]; then
    echo "$web_dir は別の所有者の領域です" >&2
    exit 1
  fi
else
  if [[ -e "$web_dir" ]]; then
    echo "$web_dir は既存の領域です。上書きせず停止します" >&2
    exit 1
  fi
  useradd --create-home --shell /bin/bash --groups hht-students "$account"
fi

home_dir=$(getent passwd "$account" | cut -d: -f6)
[[ "$home_dir" == "/home/$account" ]] || { echo "$account のホームが想定外です" >&2; exit 1; }
slice_dir="/etc/systemd/system/user-$(id -u "$account").slice.d"
slice_conf="$slice_dir/hht-practice.conf"
if [[ -e "$slice_conf" ]] && ! grep -q '^# Managed by hht-practice$' "$slice_conf"; then
  echo "$slice_conf は既存の設定です。上書きせず停止します" >&2
  exit 1
fi
chmod 0700 "$home_dir"
install -m 0600 -o root -g root "$key_file" "/etc/ssh/hht-authorized-keys/$account"

install -d -m 2750 -o "$account" -g www-data "$web_dir"
install -d -m 0755 -o root -g root "$slice_dir"
cat > "$slice_conf" <<'EOF'
# Managed by hht-practice
[Slice]
CPUQuota=50%
MemoryMax=256M
TasksMax=32
EOF
systemctl daemon-reload
if [[ ! -e "$web_dir/index.html" ]]; then
  printf '<!doctype html><html lang="ja"><meta charset="utf-8"><title>%s</title><h1>%s の練習サイト</h1></html>\n' "$student" "$student" > "$web_dir/index.html"
  chown "$account:www-data" "$web_dir/index.html"
  chmod 0640 "$web_dir/index.html"
fi
echo "追加: $account / $web_dir /students/$student/"
